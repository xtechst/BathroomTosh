import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { LeaveRequest, LeaveType } from '../models/leave';

@Injectable({
  providedIn: 'root'
})
export class LeaveService {
  private apiUrl = `${environment.apiUrl}/leave-requests`;

  constructor(private http: HttpClient) {}

  submitLeaveRequest(request: {
    leaveType: LeaveType;
    startDate: Date;
    endDate: Date;
    reason: string;
  }): Observable<{ success: boolean; message: string; leaveRequest: LeaveRequest }> {
    return this.http.post<{ success: boolean; message: string; leaveRequest: LeaveRequest }>(this.apiUrl, request);
  }

  getUserLeaveRequests(userId: string): Observable<{ success: boolean; leaveRequests: LeaveRequest[] }> {
    return this.http.get<{ success: boolean; leaveRequests: LeaveRequest[] }>(`${this.apiUrl}/user/${userId}`);
  }

  getSupervisorLeaveRequests(supervisorId: string): Observable<{ success: boolean; leaveRequests: LeaveRequest[] }> {
    return this.http.get<{ success: boolean; leaveRequests: LeaveRequest[] }>(`${this.apiUrl}/supervisor/${supervisorId}`);
  }

  getPendingLeaveRequests(): Observable<{ success: boolean; leaveRequests: LeaveRequest[] }> {
    return this.http.get<{ success: boolean; leaveRequests: LeaveRequest[] }>(`${this.apiUrl}/pending`);
  }

  approveLeaveRequest(id: string, approvalNotes?: string): Observable<{ success: boolean; message: string; leaveRequest: LeaveRequest }> {
    return this.http.patch<{ success: boolean; message: string; leaveRequest: LeaveRequest }>(`${this.apiUrl}/${id}/approve`, { approvalNotes });
  }

  rejectLeaveRequest(id: string, rejectionNotes?: string): Observable<{ success: boolean; message: string; leaveRequest: LeaveRequest }> {
    return this.http.patch<{ success: boolean; message: string; leaveRequest: LeaveRequest }>(`${this.apiUrl}/${id}/reject`, { rejectionNotes });
  }
}