import { Injectable, signal } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import {
  Task,
  Area,
  AreaName,
  ChecklistItem,
  TaskNote,
  ThreadedComment,
  TaskAssignmentValidation,
  DelegateAuditLock,
  LeaveRequest,
  BaseRole
} from '../models';
import { AuthService } from './auth.service';
import { environment } from '../../environments/environment';

/**
 * Task & Area Management Service
 * 
 * CRITICAL FEATURES:
 * 1. Checklist Integrity: Staff cannot mark task complete unless all boolean items toggled
 * 2. Traceability: Staff notes tagged as STAFF_NOTE, Supervisor feedback as FEEDBACK - both immutable
 * 3. Strict Leave Constraints: Cannot assign tasks on approved leave dates
 * 4. Active Delegate Lock: Original user in Audit Mode while delegate is active
 * 5. Threaded Comments: Notes linked directly to specific checklist items or parent notes
 */
@Injectable({
  providedIn: 'root'
})
export class TaskService {
  private areas: Area[] = [];
  private tasks: Task[] = [];
  private delegateAuditLocks: DelegateAuditLock[] = [];
  private leaveRequests: LeaveRequest[] = [];

  private areasSubject = new BehaviorSubject<Area[]>([]);
  private tasksSubject = new BehaviorSubject<Task[]>([]);

  areas$ = this.areasSubject.asObservable();
  tasks$ = this.tasksSubject.asObservable();

  private apiUrl = environment.apiUrl;

  constructor(private authService: AuthService, private http: HttpClient) {
    this.initializeMockData();
  }

  /**
   * Initialize mock data for demo
   */
  private initializeMockData(): void {
    const bathArea: Area = {
      id: 'area_bath',
      name: AreaName.BATHROOM,
      description: 'Bathroom cleaning and maintenance',
      supervisorId: 'u2',
      tasks: [],
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const kitchenArea: Area = {
      id: 'area_kitchen',
      name: AreaName.KITCHEN,
      description: 'Kitchen cleaning and inventory',
      supervisorId: 'u2',
      tasks: [],
      createdAt: new Date(),
      updatedAt: new Date()
    };

    this.areas = [bathArea, kitchenArea];
    this.areasSubject.next(this.areas);
  }

  /**
   * Get all areas
   */
  getAreas(): Observable<Area[]> {
    return this.areas$;
  }

  /**
   * Get specific area
   */
  getArea(areaId: string): Area | null {
    return this.areas.find(a => a.id === areaId) || null;
  }

  /**
   * Get all tasks
   */
  getTasks(): Observable<Task[]> {
    return this.tasks$;
  }

  /**
   * Get tasks for current user (Staff perspective)
   */
  getUserTasks(): Observable<Task[]> {
    const user = this.authService.getCurrentUser();
    if (!user) {
      return new BehaviorSubject([]).asObservable();
    }

    return new BehaviorSubject(
      this.tasks.filter(t => t.assignedTo === user.id)
    ).asObservable();
  }

  /**
   * CRITICAL: Create task with full validation
   * Validates:
   * - User has permission to assign tasks
   * - Assignee is not on approved leave
   * - Original supervisor in audit mode cannot modify (delegate must)
   */
  createTaskLocal(
    areaId: string,
    title: string,
    description: string,
    checklist: ChecklistItem[],
    assignedTo: string,
    dueDate: Date
  ): Observable<{ success: boolean; task?: Task; validation?: TaskAssignmentValidation; message: string }> {
    return new Observable(observer => {
      // Validate permissions
      if (!this.authService.hasPermission('canAssignTasks')) {
        observer.next({
          success: false,
          validation: {
            isValid: false,
            errors: ['User does not have permission to assign tasks']
          },
          message: 'Insufficient permissions'
        });
        observer.complete();
        return;
      }

      // Validate assignment constraints
      const validation = this.validateTaskAssignment(assignedTo, dueDate);
      if (!validation.isValid) {
        observer.next({
          success: false,
          validation,
          message: 'Task assignment validation failed'
        });
        observer.complete();
        return;
      }

      // Create task
      const task: Task = {
        id: `task_${Date.now()}`,
        areaId,
        areaName: this.getAreaName(areaId),
        title,
        description,
        assignedTo,
        assignedBy: this.authService.getCurrentUser()?.id,
        checklist: checklist.map(item => ({
          ...item,
          isCompleted: false
        })),
        notes: [],
        threadedComments: [],
        status: 'NOT_STARTED',
        assignedDate: new Date(),
        dueDate,
        createdAt: new Date(),
        isChecklistComplete: false
      };

      this.tasks.push(task);
      this.tasksSubject.next(this.tasks);
      
      observer.next({
        success: true,
        task,
        validation: { isValid: true, errors: [] },
        message: 'Task created successfully'
      });
      observer.complete();
    });
  }

  /**
   * CRITICAL: Complete task with checklist validation
   * Staff cannot mark task complete unless ALL boolean checklist items are toggled
   */
  completeTask(taskId: string): Observable<{ success: boolean; message: string }> {
    return new Observable(observer => {
      const task = this.tasks.find(t => t.id === taskId);
      if (!task) {
        observer.next({ success: false, message: 'Task not found' });
        observer.complete();
        return;
      }

      // Validate checklist integrity
      const incompleteBooleanItems = (task.checklist || []).filter(
        item => item.isBoolean && !item.isCompleted
      );

      if (incompleteBooleanItems.length > 0) {
        observer.next({
          success: false,
          message: `Cannot complete task. Must toggle all ${incompleteBooleanItems.length} required checklist items.`
        });
        observer.complete();
        return;
      }

      // Mark complete
      task.status = 'COMPLETED';
      task.completedAt = new Date();
      task.completedBy = this.authService.getCurrentUser()?.id;
      task.isChecklistComplete = true;
      this.tasksSubject.next(this.tasks);

      observer.next({
        success: true,
        message: 'Task completed successfully'
      });
      observer.complete();
    });
  }

  /**
   * Add note to task
   * Staff notes tagged as STAFF_NOTE, Supervisor notes as FEEDBACK
   * Once saved, notes are IMMUTABLE (cannot be deleted)
   */
  addNoteToTask(
    taskId: string,
    content: string
  ): Observable<{ success: boolean; note?: TaskNote; message: string }> {
    return new Observable(observer => {
      const task = this.tasks.find(t => t.id === taskId);
      if (!task) {
        observer.next({ success: false, message: 'Task not found' });
        observer.complete();
        return;
      }

      const currentUser = this.authService.getCurrentUser();
      if (!currentUser) {
        observer.next({ success: false, message: 'Not authenticated' });
        observer.complete();
        return;
      }

      // Determine note type based on user role
      const effectiveRole = this.authService.getEffectiveRole();
      const noteType = effectiveRole === BaseRole.STAFF ? 'STAFF_NOTE' : 'FEEDBACK';

      const note: TaskNote = {
        id: `note_${Date.now()}`,
        userId: currentUser.id || '',
        userName: currentUser.username,
        content,
        noteType,
        createdAt: new Date(),
        immutable: true // CRITICAL: Immutable once saved
      };

      if (!task.notes) {
        task.notes = [];
      }
      task.notes.push(note);
      this.tasksSubject.next(this.tasks);

      observer.next({
        success: true,
        note,
        message: `${noteType} added successfully (immutable)`
      });
      observer.complete();
    });
  }

  /**
   * Add threaded comment to a note
   * Links comments directly to parent notes for contextualization
   * Example: If Staff reports "Fridge leaking", Supervisor's response is threaded to that note
   */
  addThreadedComment(
    taskId: string,
    parentNoteId: string,
    content: string
  ): Observable<{ success: boolean; comment?: ThreadedComment; message: string }> {
    return new Observable(observer => {
      const task = this.tasks.find(t => t.id === taskId);
      if (!task) {
        observer.next({ success: false, message: 'Task not found' });
        observer.complete();
        return;
      }

      const parentNote = (task.notes || []).find(n => n.id === parentNoteId);
      if (!parentNote) {
        observer.next({ success: false, message: 'Parent note not found' });
        observer.complete();
        return;
      }

      const currentUser = this.authService.getCurrentUser();
      if (!currentUser) {
        observer.next({ success: false, message: 'Not authenticated' });
        observer.complete();
        return;
      }

      const comment: ThreadedComment = {
        id: `comment_${Date.now()}`,
        parentNoteId,
        userId: currentUser.id || '',
        userName: currentUser.username,
        content,
        createdAt: new Date(),
        immutable: true
      };

      if (!task.threadedComments) {
        task.threadedComments = [];
      }
      task.threadedComments.push(comment);
      this.tasksSubject.next(this.tasks);

      observer.next({
        success: true,
        comment,
        message: 'Threaded comment added successfully'
      });
      observer.complete();
    });
  }

  /**
   * Toggle checklist item
   */
  toggleChecklistItem(taskId: string, itemId: string): Observable<{ success: boolean; message: string }> {
    return new Observable(observer => {
      const task = this.tasks.find(t => t.id === taskId);
      if (!task) {
        observer.next({ success: false, message: 'Task not found' });
        observer.complete();
        return;
      }

      const item = (task.checklist || []).find(i => i.id === itemId);
      if (!item) {
        observer.next({ success: false, message: 'Checklist item not found' });
        observer.complete();
        return;
      }

      if (item.isBoolean) {
        item.isCompleted = !item.isCompleted;
      }

      this.tasksSubject.next(this.tasks);
      observer.next({ success: true, message: 'Checklist item toggled' });
      observer.complete();
    });
  }

  /**
   * CRITICAL: Validate task assignment
   * Checks:
   * 1. Assignee is not on approved leave
   * 2. Area supervisor not in audit mode (delegate must assign if delegated)
   */
  private validateTaskAssignment(assignedToUserId: string, dueDate: Date): TaskAssignmentValidation {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check for approved leave on due date
    const hasApprovedLeave = this.leaveRequests.some(leave =>
      leave.userId === assignedToUserId &&
      leave.status === 'APPROVED' &&
      dueDate >= leave.startDate &&
      dueDate <= leave.endDate
    );

    if (hasApprovedLeave) {
      errors.push(`Assignee has approved leave on the task due date`);
    }

    // Check if original supervisor is in audit mode
    const acting = this.authService.getActiveActingAssignment();
    const currentUser = this.authService.getCurrentUser();
    if (
      acting &&
      acting.status === 'ACTIVE' &&
      currentUser &&
      currentUser.id === acting.originalUserId
    ) {
      errors.push('Original supervisor is in Audit Mode. Delegate must manage assignments.');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings: warnings.length > 0 ? warnings : undefined
    };
  }

  /**
   * Get area name
   */
  private getAreaName(areaId: string): AreaName {
    const area = this.getArea(areaId);
    return area?.name || AreaName.BATHROOM;
  }

  /**
   * Update task status (local version)
   */
  updateTaskStatusLocal(taskId: string, status: Task['status']): Observable<{ success: boolean; message: string }> {
    return new Observable(observer => {
      const task = this.tasks.find(t => t.id === taskId);
      if (!task) {
        observer.next({ success: false, message: 'Task not found' });
        observer.complete();
        return;
      }

      task.status = status;
      this.tasksSubject.next(this.tasks);

      observer.next({ success: true, message: `Task status updated to ${status}` });
      observer.complete();
    });
  }

  /**
   * Set delegate audit lock
   * While delegate is active, original supervisor is in Read-Only mode
   */
  setDelegateAuditLock(delegateAssignmentId: string, originalUserId: string, endTime: Date): void {
    const lock: DelegateAuditLock = {
      id: `lock_${Date.now()}`,
      delegateAssignmentId,
      originalUserId,
      isActive: true,
      startTime: new Date(),
      endTime,
      createdAt: new Date()
    };

    this.delegateAuditLocks.push(lock);
  }

  /**
   * Check if user is in audit mode
   */
  isUserInAuditMode(userId: string): boolean {
    const acting = this.authService.getActiveActingAssignment();
    return !!(
      acting &&
      acting.status === 'ACTIVE' &&
      acting.originalUserId === userId &&
      this.delegateAuditLocks.some(lock =>
        lock.isActive &&
        lock.originalUserId === userId &&
        new Date() < lock.endTime
      )
    );
  }

  /**
   * API: Get tasks for a specific user
   */
  getTasksForUser(userId: string): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/tasks/user/${userId}`);
  }

  /**
   * API: Create task via HTTP
   */
  createTask(payload: any): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/tasks`, payload);
  }

  /**
   * API: Delete task via HTTP
   */
  deleteTask(taskId: string): Observable<any> {
    return this.http.delete<any>(`${this.apiUrl}/tasks/${taskId}`);
  }

  /**
   * API: Update task status
   */
  updateTaskStatus(taskId: string, status: string): Observable<any> {
    return this.http.patch<any>(`${this.apiUrl}/tasks/${taskId}/status`, { status });
  }

  /**
   * API: Get task by ID
   */
  getTaskById(taskId: string): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/tasks/${taskId}`);
  }
}

