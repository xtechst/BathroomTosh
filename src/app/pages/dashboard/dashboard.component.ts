import { Component, computed, signal, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { firstValueFrom, forkJoin, of, Observable } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { AuthService } from '../../services/auth.service';
import { TaskService } from '../../services/task.service';
import { UserService } from '../../services/user.service';
import { LeaveService } from '../../services/leave.service';
import { DashboardNavigationService } from '../../services/dashboard-navigation.service';
import { BaseRole, User, Task } from '../../models';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="dashboard">
      <div *ngIf="currentUser()" class="welcome-card">
          <h2>Welcome, {{ currentUser()!.username }}!</h2>
          <p>Your effective role: <strong [class.acting]="isActingRoleActive()">{{ effectiveRole() }}</strong></p>
          <p class="warning" *ngIf="isActingRoleActive()">Acting role will expire at {{ activeActingAssignment()!.endTime | date:'short' }}</p>
        </div>

      <div class="navigation-grid">
        <h3>Available Actions</h3>
        
        <div class="actions-list">
          <!-- Staff Actions -->
            <a *ngIf="canExecuteTasks()" routerLink="/staff/tasks" class="action-card staff">
              <div class="action-icon">📋</div>
              <div class="action-title">My Tasks</div>
              <p>View and complete assigned tasks</p>
            </a>

            <a *ngIf="currentUser() && !isManagerRole()" routerLink="/leave" class="action-card leave">
              <div class="action-icon">📅</div>
              <div class="action-title">Apply for Leave</div>
              <p>Submit leave requests for approval by your supervisor or manager</p>
            </a>

          <!-- Supervisor Actions -->
            <a *ngIf="canManageRoster()" routerLink="/supervisor/roster" class="action-card supervisor">
              <div class="action-icon">📊</div>
              <div class="action-title">Manage Roster</div>
              <p>View and manage staff roster</p>
            </a>

            <a *ngIf="canAssignTasks()" routerLink="/supervisor/assignments" class="action-card supervisor">
              <div class="action-icon">✅</div>
              <div class="action-title">Assign Tasks</div>
              <p>Create and assign tasks to staff</p>
            </a>

          <!-- Manager Actions -->
            <a *ngIf="canApproveLeave()" routerLink="/manager/leave-approvals" class="action-card manager">
              <div class="action-icon">📝</div>
              <div class="action-title">Approve Leave</div>
              <p>Review and approve leave requests</p>
            </a>

            <a *ngIf="canInitiateActingRole()" routerLink="/manager/acting-roles" class="action-card manager">
              <div class="action-icon">👤</div>
              <div class="action-title">Manage Acting Roles</div>
              <p>Delegate roles to team members</p>
            </a>
            <a *ngIf="canManageRoster()" routerLink="/manager/staff-view" class="action-card manager">
              <div class="action-icon">📋</div>
              <div class="action-title">Team Overview</div>
              <p>View supervisors and staff under your management</p>
            </a>
          <!-- Admin Actions -->
            <a *ngIf="canManageSystemConfig()" routerLink="/admin/user-management" class="action-card admin">
              <div class="action-icon">👥</div>
              <div class="action-title">User Management</div>
              <p>Create, edit, and delete users; assign roles</p>
            </a>

            <a *ngIf="canManageSystemConfig()" routerLink="/admin/system-config" class="action-card admin">
              <div class="action-icon">⚙️</div>
              <div class="action-title">System Configuration</div>
              <p>Configure system settings and permissions</p>
            </a>

            <a *ngIf="canManageSystemConfig()" routerLink="/admin/audit-logs" class="action-card admin">
              <div class="action-icon">📋</div>
              <div class="action-title">Audit Logs</div>
              <p>View complete action history</p>
            </a>
        </div>
      </div>

      <div *ngIf="isAdminRole()" class="role-overview">
          <div class="overview-row">
            <div class="overview-card">
              <p class="overview-title">Total Users</p>
              <strong>{{ adminStats().totalUsers }}</strong>
            </div>
            <div class="overview-card">
              <p class="overview-title">Active Users</p>
              <strong>{{ adminStats().activeUsers }}</strong>
            </div>
            <div class="overview-card">
              <p class="overview-title">Recent Audit Logs</p>
              <strong>{{ adminStats().totalAuditLogs }}</strong>
            </div>
            <div class="overview-card">
              <p class="overview-title">Pending Leave Requests</p>
              <strong>{{ adminStats().pendingLeaveRequests }}</strong>
            </div>
          </div>

          <div class="admin-links">
            <a routerLink="/admin/user-management" class="admin-link-card">Manage Users</a>
            <a routerLink="/admin/audit-logs" class="admin-link-card">View Audit Logs</a>
            <a routerLink="/admin/system-config" class="admin-link-card">System Configuration</a>
          </div>
        </div>

      <div *ngIf="isManagerRole()" class="manager-overview">
          <div class="overview-row">
            <div class="overview-card">
              <p class="overview-title">Supervisors</p>
              <strong>{{ stats().supervisorCount }}</strong>
            </div>
            <div class="overview-card">
              <p class="overview-title">Assigned Staff</p>
              <strong>{{ stats().staffCount }}</strong>
            </div>
            <div class="overview-card">
              <p class="overview-title">Tasks This Week</p>
              <strong>{{ stats().weeklyTasks }}</strong>
            </div>
            <div class="overview-card">
              <p class="overview-title">Tasks This Month</p>
              <strong>{{ stats().monthlyTasks }}</strong>
            </div>
          </div>

          <div class="charts-grid">
            <div class="chart-card">
              <h4>Weekly Task Trend</h4>
              <p>Tasks created for supervisors' staff by day</p>
              <p class="loading-text" *ngIf="isLoadingStats()">Loading task trend...</p>
              <div *ngIf="stats().tasksByDay.length > 0" class="chart-bars">
                  <div *ngFor="let day of stats().tasksByDay">
                    <span class="chart-label">{{ day.label }}</span>
                    <div class="chart-track">
                      <div class="chart-fill" [style.width.%]="day.width"></div>
                    </div>
                    <span class="chart-count">{{ day.count }}</span>
                  </div>
                </div>
            </div>

            <div class="chart-card">
              <h4>Monthly Task Trend</h4>
              <p>Staff task activity across the current month</p>
              <p class="loading-text" *ngIf="isLoadingStats()">Loading monthly stats...</p>
              <div *ngIf="stats().tasksByWeek.length > 0" class="chart-bars">
                  <div *ngFor="let week of stats().tasksByWeek">
                    <span class="chart-label">{{ week.label }}</span>
                    <div class="chart-track">
                      <div class="chart-fill" [style.width.%]="week.width"></div>
                    </div>
                    <span class="chart-count">{{ week.count }}</span>
                  </div>
                </div>
            </div>
          </div>

          <div class="manager-links">
            <a routerLink="/manager/staff-view" class="manager-link-card">View Staff Structure</a>
            <a routerLink="/manager/acting-roles" class="manager-link-card">Assign Tasks to Supervisors</a>
            <a routerLink="/manager/leave-approvals" class="manager-link-card">Approve Leave Requests</a>
          </div>

          <!-- Manager Leave Requests Section -->
          <div class="manager-leave-section">
            <h4>Leave Requests Awaiting Approval</h4>
            <p class="no-data" *ngIf="managerStats().leaveRequests.length === 0">No pending leave requests</p>
            <div *ngIf="managerStats().leaveRequests.length > 0" class="leave-requests-list">
                <div *ngFor="let request of managerStats().leaveRequests.slice(0, 5)" class="leave-request-item">
                  <div class="request-header">
                    <strong>{{ request.user?.firstName }} {{ request.user?.lastName }}</strong>
                    <span class="request-status" [class]="'status-' + request.status.toLowerCase()">{{ request.status }}</span>
                  </div>
                  <p>Type: {{ request.type }} | From: {{ request.startDate | date:'shortDate' }} to {{ request.endDate | date:'shortDate' }}</p>
                  <p>{{ request.reason }}</p>
                </div>
              </div>
              <a *ngIf="managerStats().leaveRequests.length > 5" routerLink="/manager/leave-approvals" class="view-more-link">View all {{ managerStats().leaveRequests.length }} requests</a>
          </div>

          <p class="error" *ngIf="statsError()">{{ statsError() }}</p>
        </div>

      <div *ngIf="isSupervisorRole()" class="supervisor-overview">
          <div class="overview-row">
            <div class="overview-card">
              <p class="overview-title">Assigned Staff</p>
              <strong>{{ supervisorStats().assignedStaff.length }}</strong>
            </div>
            <div class="overview-card">
              <p class="overview-title">Pending Tasks</p>
              <strong>{{ supervisorStats().pendingTasks }}</strong>
            </div>
            <div class="overview-card">
              <p class="overview-title">Completed Tasks</p>
              <strong>{{ supervisorStats().completedTasks }}</strong>
            </div>
            <div class="overview-card">
              <p class="overview-title">Leave Requests</p>
              <strong>{{ supervisorStats().leaveRequests.length }}</strong>
            </div>
          </div>

          <div class="supervisor-content">
            <div class="staff-progress">
              <h4>Staff Progress This Week</h4>
              <p class="loading-text" *ngIf="isLoadingStats()">Loading staff progress...</p>
              <div *ngIf="!isLoadingStats()" class="progress-table">
                  <table>
                    <thead>
                      <tr>
                        <th>Staff Member</th>
                        <th>Mon</th>
                        <th>Tue</th>
                        <th>Wed</th>
                        <th>Thu</th>
                        <th>Fri</th>
                        <th>Sat</th>
                        <th>Sun</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr *ngFor="let staff of supervisorStats().assignedStaff">
                        <td>{{ staff.firstName }} {{ staff.lastName }}</td>
                        <td *ngFor="let day of supervisorStats().weeklyProgress">
                          <span class="progress-cell">{{ day.completed }}/{{ day.total }}</span>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
            </div>

            <!-- Supervisor Leave Requests Section -->
            <div class="supervisor-leave-section">
              <h4>Leave Requests to Approve</h4>
              <p class="no-data" *ngIf="supervisorStats().leaveRequests.length === 0">No leave requests from your staff</p>
              <div *ngIf="supervisorStats().leaveRequests.length > 0" class="leave-requests-list">
                  <div *ngFor="let request of supervisorStats().leaveRequests.slice(0, 3)" class="leave-request-item">
                    <div class="request-header">
                      <strong>{{ request.user?.firstName }} {{ request.user?.lastName }}</strong>
                      <span class="request-status" [class]="'status-' + request.status.toLowerCase()">{{ request.status }}</span>
                    </div>
                    <p>Type: {{ request.type }} | From: {{ request.startDate | date:'shortDate' }} to {{ request.endDate | date:'shortDate' }}</p>
                    <p>{{ request.reason }}</p>
                  </div>
                </div>
                <a *ngIf="supervisorStats().leaveRequests.length > 3" routerLink="/supervisor/staff-view" class="view-more-link">View all {{ supervisorStats().leaveRequests.length }} requests</a>
            </div>

            <div class="supervisor-links">
              <a routerLink="/supervisor/assignments" class="supervisor-link-card">Assign Tasks</a>
              <a routerLink="/supervisor/roster" class="supervisor-link-card">Manage Roster</a>
              <a routerLink="/supervisor/staff-view" class="supervisor-link-card">View Staff</a>
            </div>
          </div>
        </div>

      <div *ngIf="isStaffRole()" class="staff-overview">
          <div class="overview-row">
            <div class="overview-card">
              <p class="overview-title">My Tasks</p>
              <strong>{{ staffStats().myTasks.length }}</strong>
            </div>
            <div class="overview-card">
              <p class="overview-title">Completed Today</p>
              <strong>{{ staffStats().completedTasks }}</strong>
            </div>
            <div class="overview-card">
              <p class="overview-title">Active Tasks</p>
              <strong>{{ staffStats().pendingTasks }}</strong>
            </div>
            <div class="overview-card">
              <p class="overview-title">This Week Progress</p>
              <strong>{{ staffWeeklyTotal() }}</strong>
            </div>
          </div>

          <div class="staff-content">
            <div class="weekly-progress">
              <h4>My Weekly Progress</h4>
              <p class="loading-text" *ngIf="isLoadingStats()">Loading progress...</p>
              <div *ngIf="!isLoadingStats()" class="progress-bars">
                  <div *ngFor="let day of staffStats().weeklyProgress" class="progress-item">
                    <span class="day-label">{{ day.day }}</span>
                    <div class="progress-bar">
                      <div class="progress-fill" [style.width.%]="getProgressWidth(day.completed)"></div>
                    </div>
                    <span class="progress-count">{{ day.completed }}</span>
                  </div>
                </div>
            </div>

            <div class="recent-tasks">
              <h4>Recent Tasks</h4>
              <div class="task-list">
                <div *ngFor="let task of staffStats().myTasks.slice(0, 5)" class="task-item">
                  <div class="task-header">
                    <strong>{{ task.title }}</strong>
                    <span class="task-status" [class]="'status-' + task.status.toLowerCase()">{{ task.status }}</span>
                  </div>
                  <p>{{ task.description || 'No description' }}</p>
                  <small>Due: {{ task.dueDate | date:'shortDate' }}</small>
                </div>
              </div>
            </div>

            <!-- Staff Leave Requests Section -->
            <div class="staff-leave-section">
              <h4>My Leave Requests</h4>
              <p class="no-data" *ngIf="staffStats().leaveRequests.length === 0">No leave requests submitted</p>
              <div *ngIf="staffStats().leaveRequests.length > 0" class="leave-requests-list">
                  <div *ngFor="let request of staffStats().leaveRequests.slice(0, 3)" class="leave-request-item">
                    <div class="request-header">
                      <strong>{{ request.type }}</strong>
                      <span class="request-status" [class]="'status-' + request.status.toLowerCase()">{{ request.status }}</span>
                    </div>
                    <p>From: {{ request.startDate | date:'shortDate' }} to {{ request.endDate | date:'shortDate' }}</p>
                    <p>{{ request.reason }}</p>
                  </div>
                </div>
            </div>

            <div class="staff-links">
              <a routerLink="/staff/tasks" class="staff-link-card">View All Tasks</a>
            </div>
          </div>
        </div>

      <div class="info-cards">
        <div class="info-card">
          <h4>RBAC System Features</h4>
          <ul>
            <li>✓ Role-Based Access Control</li>
            <li>✓ Acting Role delegation with time limits</li>
            <li>✓ Approval Auto-Escalation</li>
            <li>✓ Audit Log tracking</li>
            <li>✓ Threaded comments for tasks</li>
            <li>✓ Immutable notes system</li>
          </ul>
        </div>

        <div class="info-card">
          <h4>Your Permissions</h4>
          <ul>
            <li *ngIf="canManageSystemConfig()">System Configuration</li>
            <li *ngIf="canApproveLeave()">Leave Approval</li>
            <li *ngIf="canInitiateActingRole()">Acting Role Initiation</li>
            <li *ngIf="canManageRoster()">Roster Management</li>
            <li *ngIf="canAssignTasks()">Task Assignment</li>
            <li *ngIf="canExecuteTasks()">Task Execution</li>
            <li *ngIf="canAddNotes()">Add Notes</li>
            <li *ngIf="!canManageSystemConfig() && 
                     !canApproveLeave() && 
                     !canInitiateActingRole() && 
                     !canManageRoster() && 
                     !canAssignTasks()">
              View Only
            </li>
          </ul>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .dashboard {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      padding: 2rem;
      background: #f5f7fa;
    }

    .welcome-card {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 2rem;
      border-radius: 12px;
      margin-bottom: 3rem;
      text-align: center;
      max-width: 600px;
      width: 100%;
      box-shadow: 0 8px 24px rgba(102, 126, 234, 0.3);
    }

    .welcome-card h2 {
      margin: 0 0 0.5rem 0;
      font-size: 1.75rem;
    }

    .welcome-card p {
      margin: 0.5rem 0;
      font-size: 1rem;
    }

    .welcome-card strong {
      font-weight: 600;
    }

    .welcome-card strong.acting {
      color: #ffd700;
      animation: pulse 2s infinite;
    }

    .warning {
      background-color: rgba(255, 255, 0, 0.2);
      padding: 0.75rem;
      border-radius: 4px;
      margin-top: 1rem;
      color: #ffd700;
    }

    .navigation-grid {
      display: flex;
      flex-direction: column;
      align-items: center;
      width: 100%;
      margin-bottom: 3rem;
    }

    .navigation-grid h3 {
      color: #333;
      font-size: 1.5rem;
      margin-bottom: 2rem;
      text-transform: uppercase;
      letter-spacing: 1px;
    }

    .actions-list {
      display: grid;
      grid-template-columns: repeat(4, minmax(200px, 1fr));
      gap: 1.5rem;
      width: 100%;
      max-width: 1200px;
    }

    .action-card {
      padding: 1.5rem;
      background: #be03fc;
      border-radius: 12px;
      text-decoration: none;
      color: white;
      transition: all 0.3s ease;
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
      cursor: pointer;
      min-height: 180px;
      justify-content: center;
    }

    .action-card.staff {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    }

    .action-card.supervisor {
      background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
    }

    .action-card.manager {
      background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
    }

    .action-card.admin {
      background: linear-gradient(135deg, #fa709a 0%, #fee140 100%);
      color: #333;
    }

    .action-card:hover {
      transform: translateY(-5px);
      box-shadow: 0 8px 20px rgba(0, 0, 0, 0.15);
    }

    .action-icon {
      font-size: 2.5rem;
      margin-bottom: 1rem;
    }

    .action-title {
      font-size: 1.1rem;
      font-weight: 600;
      margin-bottom: 0.5rem;
    }

    .action-card p {
      margin: 0;
      font-size: 0.85rem;
      opacity: 0.9;
    }

    .info-cards {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
      gap: 2rem;
      width: 100%;
      max-width: 1200px;
    }

    .manager-overview {
      width: 100%;
      max-width: 1200px;
      margin-bottom: 2rem;
    }

    .overview-row {
      display: grid;
      grid-template-columns: repeat(4, minmax(180px, 1fr));
      gap: 1rem;
      margin-bottom: 1.5rem;
    }

    .overview-card {
      background: white;
      padding: 1.25rem;
      border-radius: 12px;
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
      text-align: center;
    }

    .overview-title {
      margin: 0 0 0.75rem 0;
      color: #555;
      font-size: 0.95rem;
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }

    .overview-card strong {
      font-size: 2rem;
      color: #1a237e;
    }

    .charts-grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(300px, 1fr));
      gap: 1.5rem;
      margin-bottom: 1.5rem;
    }

    .chart-card {
      background: white;
      padding: 1.5rem;
      border-radius: 12px;
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
    }

    .chart-card h4 {
      margin-top: 0;
      color: #1a237e;
    }

    .chart-bars {
      display: grid;
      gap: 0.75rem;
      margin-top: 1rem;
    }

    .chart-label {
      display: inline-block;
      width: 58px;
      font-size: 0.85rem;
      color: #333;
    }

    .chart-track {
      display: inline-block;
      width: calc(100% - 120px);
      height: 14px;
      background: #eef2ff;
      border-radius: 999px;
      vertical-align: middle;
      margin: 0 10px;
    }

    .chart-fill {
      height: 100%;
      background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
      border-radius: 999px;
    }

    .chart-count {
      display: inline-block;
      width: 32px;
      text-align: right;
      font-size: 0.85rem;
      color: #333;
    }

    .manager-links {
      display: flex;
      flex-wrap: wrap;
      gap: 1rem;
    }

    .manager-link-card {
      padding: 1rem 1.25rem;
      border-radius: 12px;
      background: #e8f4ff;
      color: #0d47a1;
      text-decoration: none;
      font-weight: 600;
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.05);
    }

    .loading-text {
      margin: 0.75rem 0 0 0;
      color: #555;
      font-size: 0.95rem;
    }

    .error {
      color: #d32f2f;
      margin-top: 1rem;
    }

    .info-card {
      background: white;
      padding: 1.5rem;
      border-radius: 12px;
      border-left: 4px solid #667eea;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
    }

    .info-card h4 {
      margin: 0 0 1rem 0;
      color: #333;
      font-size: 1.1rem;
    }

    .info-card ul {
      margin: 0;
      padding-left: 1.5rem;
      list-style: none;
    }

    .info-card li {
      padding: 0.5rem 0;
      color: #666;
      font-size: 0.95rem;
    }

    .info-card li:before {
      content: "• ";
      color: #667eea;
      font-weight: bold;
      margin-right: 0.5rem;
    }

    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.7; }
    }

    @media (max-width: 1024px) {
      .actions-list {
        grid-template-columns: repeat(3, minmax(150px, 1fr));
      }
    }

    @media (max-width: 768px) {
      .dashboard {
        min-height: auto;
        padding: 1rem;
      }

      .actions-list {
        grid-template-columns: repeat(2, minmax(120px, 1fr));
        gap: 1rem;
      }

      .welcome-card {
        margin-bottom: 2rem;
        padding: 1.5rem;
      }

      .welcome-card h2 {
        font-size: 1.25rem;
      }

      .navigation-grid h3 {
        font-size: 1.25rem;
        margin-bottom: 1.5rem;
      }

      .action-card {
        padding: 1rem;
      }

      .action-icon {
        font-size: 2rem;
      }

      .action-title {
        font-size: 0.95rem;
      }

      .action-card p {
        font-size: 0.75rem;
      }
    }

    .role-overview {
      width: 100%;
      max-width: 1200px;
      margin-bottom: 2rem;
    }

    .admin-links {
      display: flex;
      flex-wrap: wrap;
      gap: 1rem;
    }

    .admin-link-card {
      padding: 1rem 1.25rem;
      border-radius: 12px;
      background: linear-gradient(135deg, #fa709a 0%, #fee140 100%);
      color: #333;
      text-decoration: none;
      font-weight: 500;
      transition: all 0.3s ease;
    }

    .admin-link-card:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(250, 112, 154, 0.3);
    }

    .supervisor-overview {
      width: 100%;
      max-width: 1200px;
      margin-bottom: 2rem;
    }

    .supervisor-content {
      display: grid;
      grid-template-columns: 1fr;
      gap: 1.5rem;
    }

    .staff-progress {
      background: white;
      padding: 1.5rem;
      border-radius: 12px;
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
    }

    .progress-table {
      overflow-x: auto;
      margin-top: 1rem;
    }

    .progress-table table {
      width: 100%;
      border-collapse: collapse;
    }

    .progress-table th,
    .progress-table td {
      padding: 0.75rem;
      text-align: left;
      border-bottom: 1px solid #eee;
    }

    .progress-table th {
      background: #f8f9fa;
      font-weight: 600;
      color: #333;
    }

    .progress-cell {
      font-size: 0.9rem;
      color: #555;
    }

    .supervisor-leave-section {
      background: white;
      padding: 1.5rem;
      border-radius: 12px;
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
    }

    .supervisor-leave-section h4 {
      margin-top: 0;
      color: #1a237e;
    }

    .supervisor-link-card {
      padding: 1rem 1.25rem;
      border-radius: 12px;
      background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
      color: white;
      text-decoration: none;
      font-weight: 500;
      transition: all 0.3s ease;
    }

    .supervisor-link-card:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(240, 147, 251, 0.3);
    }

    .staff-overview {
      width: 100%;
      max-width: 1200px;
      margin-bottom: 2rem;
    }

    .staff-content {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 1.5rem;
    }

    .weekly-progress {
      background: white;
      padding: 1.5rem;
      border-radius: 12px;
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
    }

    .progress-bars {
      display: grid;
      gap: 1rem;
      margin-top: 1rem;
    }

    .progress-item {
      display: flex;
      align-items: center;
      gap: 1rem;
    }

    .day-label {
      width: 40px;
      font-weight: 500;
      color: #333;
    }

    .progress-bar {
      flex: 1;
      height: 12px;
      background: #eef2ff;
      border-radius: 999px;
    }

    .progress-fill {
      height: 100%;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      border-radius: 999px;
      transition: width 0.3s ease;
    }

    .progress-count {
      width: 30px;
      text-align: right;
      font-size: 0.9rem;
      color: #555;
    }

    .recent-tasks {
      background: white;
      padding: 1.5rem;
      border-radius: 12px;
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
    }

    .task-list {
      display: grid;
      gap: 1rem;
      margin-top: 1rem;
    }

    .task-item {
      padding: 1rem;
      border: 1px solid #eee;
      border-radius: 8px;
      background: #fafafa;
    }

    .task-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 0.5rem;
    }

    .task-status {
      padding: 0.25rem 0.5rem;
      border-radius: 4px;
      font-size: 0.8rem;
      font-weight: 500;
      text-transform: uppercase;
    }

    .status-completed {
      background: #d4edda;
      color: #155724;
    }

    .status-in_progress {
      background: #fff3cd;
      color: #856404;
    }

    .status-pending {
      background: #f8d7da;
      color: #721c24;
    }

    .staff-leave-section {
      background: white;
      padding: 1.5rem;
      border-radius: 12px;
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
    }

    .staff-leave-section h4 {
      margin-top: 0;
      color: #1a237e;
    }

    .staff-link-card {
      padding: 1rem 1.25rem;
      border-radius: 12px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      text-decoration: none;
      font-weight: 500;
      transition: all 0.3s ease;
    }

    .manager-leave-section {
      background: white;
      padding: 1.5rem;
      border-radius: 12px;
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
      margin-top: 1.5rem;
    }

    .manager-leave-section h4 {
      margin-top: 0;
      color: #1a237e;
    }

    .leave-requests-list {
      display: grid;
      gap: 1rem;
      margin-top: 1rem;
    }

    .leave-request-item {
      padding: 1rem;
      border: 1px solid #eee;
      border-radius: 8px;
      background: #fafafa;
    }

    .request-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 0.5rem;
    }

    .request-status {
      padding: 0.25rem 0.5rem;
      border-radius: 4px;
      font-size: 0.8rem;
      font-weight: 500;
      text-transform: uppercase;
    }

    .status-pending {
      background: #fff3cd;
      color: #856404;
    }

    .status-approved {
      background: #d4edda;
      color: #155724;
    }

    .status-rejected {
      background: #f8d7da;
      color: #721c24;
    }

    .no-data {
      color: #666;
      font-style: italic;
      margin: 1rem 0;
    }

    .view-more-link {
      display: inline-block;
      margin-top: 1rem;
      color: #1976d2;
      text-decoration: none;
      font-weight: 500;
    }

    .view-more-link:hover {
      text-decoration: underline;
    }
  `]
})
export class DashboardComponent implements OnInit {
  isLoadingStats = signal(false);
  statsError = signal('');
  stats = signal({
    supervisorCount: 0,
    staffCount: 0,
    weeklyTasks: 0,
    monthlyTasks: 0,
    tasksByDay: [] as Array<{ label: string; count: number; width: number }> ,
    tasksByWeek: [] as Array<{ label: string; count: number; width: number }>
  });

  // Admin stats
  adminStats = signal({
    totalUsers: 0,
    activeUsers: 0,
    totalAuditLogs: 0,
    pendingLeaveRequests: 0
  });

  // Manager stats
  managerStats = signal({
    pendingLeaveRequests: 0,
    approvedLeaveRequests: 0,
    supervisors: [] as any[],
    leaveRequests: [] as any[]
  });

  // Supervisor stats
  supervisorStats = signal({
    assignedStaff: [] as any[],
    pendingTasks: 0,
    completedTasks: 0,
    leaveRequests: [] as any[],
    weeklyProgress: [] as Array<{ day: string; completed: number; total: number }>
  });

  // Staff stats
  staffStats = signal({
    myTasks: [] as any[],
    completedTasks: 0,
    pendingTasks: 0,
    weeklyProgress: [] as Array<{ day: string; completed: number }>,
    roster: [] as any[],
    leaveRequests: [] as any[]
  });

  constructor(
    private authService: AuthService,
    private taskService: TaskService,
    private userService: UserService,
    private leaveService: LeaveService,
    private dashboardNavService: DashboardNavigationService
  ) {}

  ngOnInit() {
    setTimeout(() => {
      this.dashboardNavService.navigateToDashboard();
    }, 100);

    // Load role-specific stats
    const user = this.currentUser();
    if (user) {
      switch (user.baseRole) {
        case BaseRole.TECH_ADMIN:
          this.loadAdminStats();
          break;
        case BaseRole.MANAGER:
          this.loadManagerTaskOverview();
          break;
        case BaseRole.SUPERVISOR:
          this.loadSupervisorStats();
          break;
        case BaseRole.STAFF:
          this.loadStaffStats();
          break;
      }
    }
  }

  async loadManagerTaskOverview(): Promise<void> {
    this.isLoadingStats.set(true);
    this.statsError.set('');

    try {
      const user = this.currentUser();
      if (!user) return;

      // Get all supervisors under this manager
      const supervisorsResponse = await firstValueFrom(this.userService.getSupervisorsUnderManager(user._id || user.id || ''));
      if (!supervisorsResponse.success) {
        this.statsError.set('Failed to load supervisors');
        return;
      }

      const supervisors = supervisorsResponse.supervisors || [];
      const supervisorIds = supervisors.map((s: any) => s._id || s.id);

      // Get all staff under these supervisors
      const staffPromises = supervisorIds.map((id: string) =>
        firstValueFrom(this.userService.getStaffUnderSupervisor(id))
      );

      const staffResults = await Promise.all(staffPromises);
      const allStaff = staffResults
        .filter(result => result.success)
        .flatMap(result => result.staff || []);

      // Get tasks for all staff
      const taskPromises = allStaff.map(staff =>
        firstValueFrom(this.taskService.getTasksForUser(staff._id || staff.id || ''))
      );

      const taskResults = await Promise.all(taskPromises);
      const allTasks = taskResults
        .filter(result => result.success)
        .flatMap(result => result.tasks || []);

      const stats = this.computeTaskStats(allTasks, supervisors.length, allStaff.length);
      this.stats.set(stats);

    } catch (error) {
      console.error('Failed to load manager task overview:', error);
      this.statsError.set('Failed to load task statistics');
    } finally {
      this.isLoadingStats.set(false);
    }
  }

  async loadSupervisorStats(): Promise<void> {
    this.isLoadingStats.set(true);
    try {
      const user = this.currentUser();
      if (!user) return;

      // Get staff under this supervisor
      const staffResponse = await firstValueFrom(this.userService.getStaffUnderSupervisor(user._id || user.id || ''));
      if (staffResponse.success) {
        const staff = staffResponse.staff || [];

        // Get tasks for all staff
        const taskObservables: Observable<{ success: boolean; tasks: Task[] }>[] = staff.map((member: User) =>
          this.taskService.getTasksForUser(member._id || member.id || '').pipe(
            catchError(() => of({ success: false, tasks: [] as Task[] }))
          )
        );

        forkJoin(taskObservables).subscribe((results: Array<{ success: boolean; tasks: Task[] }>) => {
          const allTasks = results.reduce((acc: Task[], result: { success: boolean; tasks: Task[] }) => acc.concat(result.tasks || []), []);
          const pendingTasks = allTasks.filter((t: any) => t.status !== 'COMPLETED').length;
          const completedTasks = allTasks.filter((t: any) => t.status === 'COMPLETED').length;

          // Calculate weekly progress
          const weeklyProgress = this.calculateWeeklyProgress(allTasks);

          // Get leave requests from staff under this supervisor
          firstValueFrom(this.userService.getLeaveRequestsForSupervisor(user._id || user.id || '')).then((leaveRequestsResponse: any) => {
            const leaveRequests = leaveRequestsResponse.success ? leaveRequestsResponse.leaveRequests || [] : [];

            this.supervisorStats.set({
              assignedStaff: staff,
              pendingTasks,
              completedTasks,
              leaveRequests,
              weeklyProgress
            });
            this.isLoadingStats.set(false);
          });
        });
      }
    } catch (error) {
      console.error('Failed to load supervisor stats:', error);
      this.isLoadingStats.set(false);
    }
  }

  async loadStaffStats(): Promise<void> {
    this.isLoadingStats.set(true);
    try {
      const user = this.currentUser();
      if (!user) return;

      const tasksResponse = await firstValueFrom(this.taskService.getTasksForUser(user._id || user.id || ''));
      if (tasksResponse.success) {
        const tasks = tasksResponse.tasks || [];
        const completedToday = tasks.filter((t: any) =>
          t.status === 'COMPLETED' &&
          new Date(t.completedAt).toDateString() === new Date().toDateString()
        ).length;

        const weeklyProgress = this.calculateStaffWeeklyProgress(tasks);

        // Get user's leave requests
        const leaveRequestsResponse = await firstValueFrom(this.leaveService.getUserLeaveRequests(user._id || user.id || ''));
        const leaveRequests = leaveRequestsResponse.success ? leaveRequestsResponse.leaveRequests || [] : [];

        const pendingTasks = tasks.filter((t: any) => t.status !== 'COMPLETED').length;
        const completedTasks = tasks.filter((t: any) => t.status === 'COMPLETED').length;

        this.staffStats.set({
          myTasks: tasks,
          completedTasks,
          pendingTasks,
          weeklyProgress,
          leaveRequests,
          roster: []
        });
      }
      this.isLoadingStats.set(false);
    } catch (error) {
      console.error('Failed to load staff stats:', error);
      this.isLoadingStats.set(false);
    }
  }

  async loadAdminStats(): Promise<void> {
    try {
      const usersResponse = await firstValueFrom(this.userService.getAllUsers());
      if (usersResponse.success) {
        const users = usersResponse.users || [];
        const activeUsers = users.filter((u: any) => u.isActive !== false).length;

        this.adminStats.set({
          totalUsers: users.length,
          activeUsers,
          totalAuditLogs: 0,
          pendingLeaveRequests: 0
        });
      }
    } catch (error) {
      console.error('Failed to load admin stats:', error);
    }
  }

  calculateWeeklyProgress(tasks: any[]): Array<{ day: string; completed: number; total: number }> {
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const now = new Date();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay() + 1); // Monday

    return days.map((day, index) => {
      const date = new Date(startOfWeek);
      date.setDate(startOfWeek.getDate() + index);

      const dayTasks = tasks.filter(t => {
        const taskDate = new Date(t.createdAt || t.dueDate);
        return taskDate.toDateString() === date.toDateString();
      });

      return {
        day,
        completed: dayTasks.filter(t => t.status === 'COMPLETED').length,
        total: dayTasks.length
      };
    });
  }

  calculateStaffWeeklyProgress(tasks: any[]): Array<{ day: string; completed: number }> {
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const now = new Date();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay() + 1);

    return days.map((day, index) => {
      const date = new Date(startOfWeek);
      date.setDate(startOfWeek.getDate() + index);

      const completedTasks = tasks.filter(t =>
        t.status === 'COMPLETED' &&
        new Date(t.completedAt).toDateString() === date.toDateString()
      ).length;

      return { day, completed: completedTasks };
    });
  }

  computeTaskStats(tasks: any[], supervisorCount: number, staffCount: number) {
    const now = new Date();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    startOfWeek.setHours(0, 0, 0, 0);

    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const days = Array.from({ length: 7 }, (_, idx) => {
      const date = new Date(startOfWeek);
      date.setDate(startOfWeek.getDate() + idx);
      return { date, label: date.toLocaleDateString(undefined, { weekday: 'short' }), count: 0 };
    });

    const weeks = Array.from({ length: 4 }, (_, idx) => {
      const start = new Date(startOfMonth);
      start.setDate(1 + idx * 7);
      const label = `W${idx + 1}`;
      return { start, label, count: 0 };
    });

    const monthlyTasks = tasks.filter(task => {
      const date = new Date(task.createdAt || task.dueDate || task.assignedDate || now);
      return date >= startOfMonth && date <= now;
    }).length;

    const weeklyTasks = tasks.filter(task => {
      const date = new Date(task.createdAt || task.dueDate || task.assignedDate || now);
      return date >= startOfWeek && date <= now;
    }).length;

    tasks.forEach(task => {
      const date = new Date(task.createdAt || task.dueDate || task.assignedDate || now);
      if (date >= startOfWeek && date <= now) {
        const index = Math.min(6, Math.max(0, Math.floor((date.getTime() - startOfWeek.getTime()) / 86400000)));
        days[index].count += 1;
      }

      weeks.forEach((week, idx) => {
        const weekStart = new Date(week.start);
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekStart.getDate() + 6);
        if (date >= weekStart && date <= weekEnd && date <= now) {
          weeks[idx].count += 1;
        }
      });
    });

    const maxDayCount = Math.max(...days.map(d => d.count), 1);
    const maxWeekCount = Math.max(...weeks.map(w => w.count), 1);

    return {
      supervisorCount,
      staffCount,
      weeklyTasks,
      monthlyTasks,
      tasksByDay: days.map(day => ({ label: day.label, count: day.count, width: Math.round((day.count / maxDayCount) * 100) || 5 })),
      tasksByWeek: weeks.map(week => ({ label: week.label, count: week.count, width: Math.round((week.count / maxWeekCount) * 100) || 5 }))
    };
  }

  currentUser = computed(() => this.authService.getCurrentUser());
  effectiveRole = () => this.authService.getEffectiveRole();
  activeActingAssignment = computed(() => this.authService.getActiveActingAssignment());
  
  isActingRoleActive = computed(() => {
    const assignment = this.activeActingAssignment();
    return assignment && assignment.status === 'ACTIVE';
  });

  permissions = computed(() => this.authService.getEffectivePermissions());

  canManageSystemConfig = computed(() => this.permissions().canManageSystemConfig);
  canApproveLeave = computed(() => this.permissions().canApproveLeave);
  canInitiateActingRole = computed(() => this.permissions().canInitiateActingRole);
  canManageRoster = computed(() => this.permissions().canManageRoster);
  canAssignTasks = computed(() => this.permissions().canAssignTasks);
  canExecuteTasks = computed(() => this.permissions().canExecuteTasks);
  canAddNotes = computed(() => this.permissions().canAddNotes);
  isManagerRole = computed(() => this.currentUser()?.baseRole === BaseRole.MANAGER);
  isAdminRole = computed(() => this.currentUser()?.baseRole === BaseRole.TECH_ADMIN);
  isSupervisorRole = computed(() => this.currentUser()?.baseRole === BaseRole.SUPERVISOR);
  isStaffRole = computed(() => this.currentUser()?.baseRole === BaseRole.STAFF);

  staffWeeklyTotal = computed(() => {
    const progress = this.staffStats().weeklyProgress;
    return progress.reduce((sum: number, day: any) => sum + (day.completed || 0), 0);
  });

  getProgressWidth(completed: number): number {
    return Math.min((completed / 5) * 100, 100);
  }
}
