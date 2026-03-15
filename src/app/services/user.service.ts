import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { User } from '../models';

export interface CreateUserRequest {
  username: string;
  password: string;
  baseRole?: string;
  email?: string;
  firstName?: string;
  lastName?: string;
}

export interface UpdateUserRequest {
  email?: string;
  firstName?: string;
  lastName?: string;
  baseRole?: string;
}

export interface AssignSupervisorRequest {
  supervisorId: string;
}

@Injectable({
  providedIn: 'root'
})
export class UserService {
  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  /**
   * Create a new user (Admin only)
   */
  createUser(payload: CreateUserRequest): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/users`, payload);
  }

  /**
   * Get all users (Admin/Manager)
   */
  getAllUsers(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/users`);
  }

  /**
   * Get user by ID
   */
  getUserById(userId: string): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/users/${userId}`);
  }

  /**
   * Get staff under a specific supervisor
   */
  getStaffUnderSupervisor(supervisorId: string): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/users/supervisor/${supervisorId}`);
  }

  /**
   * Update user details (Admin only)
   */
  updateUser(userId: string, payload: UpdateUserRequest): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/users/${userId}`, payload);
  }

  /**
   * Assign role to user (Admin only)
   */
  assignRole(userId: string, role: string): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/users/${userId}/role`, { baseRole: role });
  }

  /**
   * Assign supervisor to staff member (Manager/Admin only)
   */
  assignSupervisor(staffId: string, supervisorId: string): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/users/${staffId}/supervisor`, { supervisorId });
  }

  /**
   * Delete user (Admin only)
   */
  deleteUser(userId: string): Observable<any> {
    return this.http.delete<any>(`${this.apiUrl}/users/${userId}`);
  }
}
