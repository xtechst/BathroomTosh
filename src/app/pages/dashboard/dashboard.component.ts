import { Component, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { TaskService } from '../../services/task.service';
import { BaseRole } from '../../models';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="dashboard">
      @if (currentUser()) {
        <div class="welcome-card">
          <h2>Welcome, {{ currentUser()!.username }}!</h2>
          <p>Your effective role: <strong [class.acting]="isActingRoleActive()">{{ effectiveRole() }}</strong></p>
          @if (isActingRoleActive()) {
            <p class="warning">Acting role will expire at {{ activeActingAssignment()!.endTime | date:'short' }}</p>
          }
        </div>
      }

      <div class="navigation-grid">
        <h3>Available Actions</h3>
        
        <div class="actions-list">
          <!-- Staff Actions -->
          @if (canExecuteTasks()) {
            <a routerLink="/staff/tasks" class="action-card staff">
              <div class="action-icon">📋</div>
              <div class="action-title">My Tasks</div>
              <p>View and complete assigned tasks</p>
            </a>
          }

          <!-- Supervisor Actions -->
          @if (canManageRoster()) {
            <a routerLink="/supervisor/roster" class="action-card supervisor">
              <div class="action-icon">📊</div>
              <div class="action-title">Manage Roster</div>
              <p>View and manage staff roster</p>
            </a>
          }

          @if (canAssignTasks()) {
            <a routerLink="/supervisor/assignments" class="action-card supervisor">
              <div class="action-icon">✅</div>
              <div class="action-title">Assign Tasks</div>
              <p>Create and assign tasks to staff</p>
            </a>
          }

          <!-- Manager Actions -->
          @if (canApproveLeave()) {
            <a routerLink="/manager/leave-approvals" class="action-card manager">
              <div class="action-icon">📝</div>
              <div class="action-title">Approve Leave</div>
              <p>Review and approve leave requests</p>
            </a>
          }

          @if (canInitiateActingRole()) {
            <a routerLink="/manager/acting-roles" class="action-card manager">
              <div class="action-icon">👤</div>
              <div class="action-title">Manage Acting Roles</div>
              <p>Delegate roles to team members</p>
            </a>
          }

          <!-- Admin Actions -->
          @if (canManageSystemConfig()) {
            <a routerLink="/admin/user-management" class="action-card admin">
              <div class="action-icon">👥</div>
              <div class="action-title">User Management</div>
              <p>Create, edit, and delete users; assign roles</p>
            </a>
          }

          @if (canManageSystemConfig()) {
            <a routerLink="/admin/system-config" class="action-card admin">
              <div class="action-icon">⚙️</div>
              <div class="action-title">System Configuration</div>
              <p>Configure system settings and permissions</p>
            </a>
          }

          @if (canManageSystemConfig()) {
            <a routerLink="/admin/audit-logs" class="action-card admin">
              <div class="action-icon">📋</div>
              <div class="action-title">Audit Logs</div>
              <p>View complete action history</p>
            </a>
          }
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
      border-radius: 12px;
      text-decoration: none;
      color: white;
      transition: all 0.3s ease;
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
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
  `]
})
export class DashboardComponent {
  constructor(
    private authService: AuthService,
    private taskService: TaskService
  ) {}

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
}
