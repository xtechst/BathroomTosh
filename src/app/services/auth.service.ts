import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, interval } from 'rxjs';
import { map, startWith, tap, catchError } from 'rxjs/operators';
import { of } from 'rxjs';
import { environment } from '../../environments/environment';
import { 
  BaseRole, 
  User, 
  ActingAssignment, 
  ROLE_PERMISSIONS,
  RolePermissions,
  AuditLog,
  LeaveRequest 
} from '../models';

/**
 * Authentication & RBAC Service
 * Manages user authentication, roles, permissions, and the critical "Acting Role" logic
 * 
 * CRITICAL FEATURES:
 * 1. Acting roles are time-bound temporal states, NOT permanent changes
 * 2. At Acting_End + 1 second, system forces session refresh and reverts to Base Role
 * 3. Approval Paradox: Auto-escalates leave requests from Acting Supervisors
 * 4. All actions logged in Audit Log for complete traceability
 */
@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private currentUserSubject = signal<User | null>(null);
  private actingAssignmentSubject = signal<ActingAssignment | null>(null);
  
  // Observable for reactive updates
  private currentUser$ = new BehaviorSubject<User | null>(null);
  private actingAssignment$ = new BehaviorSubject<ActingAssignment | null>(null);
  
  private apiUrl = environment.apiUrl;
  
  constructor(private http: HttpClient) {
    // Load user from localStorage if exists
    const savedUser = localStorage.getItem('currentUser');
    if (savedUser) {
      const user = JSON.parse(savedUser);
      this.currentUserSubject.set(user);
      this.currentUser$.next(user);
    }
    this.initializeActingRoleMonitor();
  }

  /**
   * Authenticate user and set current session
   */
  login(username: string, password: string): Observable<{ success: boolean; message: string }> {
    return this.http.post<any>(`${this.apiUrl}/auth/login`, { username, password })
      .pipe(
        tap(response => {
          if (response.success) {
            // Save token to localStorage
            localStorage.setItem('authToken', response.token);
            // Save user to localStorage
            localStorage.setItem('currentUser', JSON.stringify(response.user));
            // Update signals
            this.currentUserSubject.set(response.user);
            this.currentUser$.next(response.user);
          }
        }),
        catchError(error => {
          console.error('Login error:', error);
          return of({ success: false, message: error.error?.message || 'Login failed' });
        })
      );
  }

  logout(): void {
    this.http.post(`${this.apiUrl}/auth/logout`, {}).subscribe({
      next: () => {
        localStorage.removeItem('authToken');
        localStorage.removeItem('currentUser');
        this.currentUserSubject.set(null);
        this.actingAssignmentSubject.set(null);
        this.currentUser$.next(null);
        this.actingAssignment$.next(null);
      },
      error: () => {
        // Still logout even if API call fails
        localStorage.removeItem('authToken');
        localStorage.removeItem('currentUser');
        this.currentUserSubject.set(null);
        this.currentUser$.next(null);
      }
    });
  }

  /**
   * Get current user
   */
  getCurrentUser(): User | null {
    return this.currentUserSubject();
  }

  getCurrentUser$(): Observable<User | null> {
    return this.currentUser$.asObservable();
  }

  /**
   * Get current acting assignment if active
   */
  getActiveActingAssignment(): ActingAssignment | null {
    return this.actingAssignmentSubject();
  }

  getActiveActingAssignment$(): Observable<ActingAssignment | null> {
    return this.actingAssignment$.asObservable();
  }

  /**
   * Get effective role (considering acting assignment)
   */
  getEffectiveRole(): BaseRole {
    const user = this.currentUserSubject();
    const acting = this.actingAssignmentSubject();
    
    if (acting && acting.status === 'ACTIVE') {
      return acting.permissionsGranted;
    }
    
    return user?.baseRole || BaseRole.STAFF;
  }

  /**
   * Get effective permissions for current user
   */
  getEffectivePermissions(): RolePermissions {
    const role = this.getEffectiveRole();
    return ROLE_PERMISSIONS[role];
  }

  /**
   * Check if user has specific permission
   */
  hasPermission(permission: keyof RolePermissions): boolean {
    return this.getEffectivePermissions()[permission];
  }

  /**
   * CRITICAL: Initiate Acting Role
   * Creates time-bound delegation to prevent logic loops
   */
  initiateActingRole(
    originalUserId: string,
    delegateUserId: string,
    roleToDelegate: BaseRole,
    durationMinutes: number
  ): Observable<{ success: boolean; assignment?: ActingAssignment; message: string }> {
    const startTime = new Date();
    const endTime = new Date(startTime.getTime() + durationMinutes * 60000);

    return this.http.post<any>(`${this.apiUrl}/acting-roles`, {
      delegateUserId,
      delegatedRole: roleToDelegate,
      startTime,
      endTime,
      reason: `Acting role delegation for ${durationMinutes} minutes`
    }).pipe(
      tap(response => {
        if (response.success && response.actingAssignment) {
          this.actingAssignmentSubject.set(response.actingAssignment);
          this.actingAssignment$.next(response.actingAssignment);
        }
      }),
      catchError(error => {
        console.error('Acting role error:', error);
        return of({ success: false, message: error.error?.message || 'Failed to initiate acting role' });
      })
    );
  }

  /**
   * CRITICAL: Revoke Acting Role
   */
  revokeActingRole(actingAssignmentId: string): Observable<{ success: boolean; message: string }> {
    return this.http.patch<any>(`${this.apiUrl}/acting-roles/${actingAssignmentId}/revoke`, {})
      .pipe(
        tap(response => {
          if (response.success) {
            this.actingAssignmentSubject.set(null);
            this.actingAssignment$.next(null);
          }
        }),
        catchError(error => {
          console.error('Revoke acting role error:', error);
          return of({ success: false, message: error.error?.message || 'Failed to revoke acting role' });
        })
      );
  }

  /**
   * CRITICAL: Monitor Acting Role expiration
   * At Acting_End + 1 second, force session refresh and revert to Base Role
   */
  private initializeActingRoleMonitor(): void {
    interval(5000).subscribe(() => {
      const acting = this.actingAssignmentSubject();
      if (acting && acting.status === 'ACTIVE') {
        const now = new Date();
        if (now > acting.endTime) {
          acting.status = 'EXPIRED';
          this.actingAssignmentSubject.set(acting);
          this.actingAssignment$.next(acting);
          
          // Force reload after 1 second
          setTimeout(() => {
            window.location.reload();
          }, 1000);
        }
      }
    });
  }


  /**
   * THE APPROVAL PARADOX: Auto-escalate leave requests from Acting Supervisors
   * If an Acting Supervisor requests leave, escalate to Manager/Tech Admin
   */
  submitLeaveRequest(
    userId: string,
    startDate: Date,
    endDate: Date,
    reason: string
  ): Observable<{ success: boolean; leaveRequest?: LeaveRequest; message: string }> {
    return this.http.post<any>(`${this.apiUrl}/leave-requests`, {
      startDate,
      endDate,
      reason
    }).pipe(
      map(response => ({
        success: response.success,
        message: response.message,
        leaveRequest: response.leaveRequest
      })),
      catchError(error => {
        console.error('Leave request error:', error);
        return of({ success: false, message: error.error?.message || 'Leave request failed' });
      })
    );
  }

  /**
   * Get audit logs (Admin only)
   */
  getAuditLogs(): Observable<AuditLog[]> {
    return this.http.get<any>(`${this.apiUrl}/audit-logs`)
      .pipe(
        map(response => response.logs || []),
        catchError(error => {
          console.error('Audit logs error:', error);
          return of([]);
        })
      );
  }

  /**
   * Get audit logs for a specific user
   */
  getUserAuditLog(userId: string): Observable<AuditLog[]> {
    return this.http.get<any>(`${this.apiUrl}/audit-logs/user/${userId}`)
      .pipe(
        map(response => response.logs || []),
        catchError(error => {
          console.error('User audit logs error:', error);
          return of([]);
        })
      );
  }
}
