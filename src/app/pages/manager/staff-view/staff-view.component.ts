import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { AuthService } from '../../../services/auth.service';
import { UserService } from '../../../services/user.service';
import { TaskService } from '../../../services/task.service';
import { User, Task } from '../../../models';

@Component({
  selector: 'app-manager-staff',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  template: `
    <div class="manager-staff-container">
      <h1>Team Overview</h1>

      <div *ngIf="loadError()" class="error-message">
        {{ loadError() }}
      </div>
      <div *ngIf="assignError()" class="error-message">
        {{ assignError() }}
      </div>
      <div *ngIf="assignSuccess()" class="success-message">
        {{ assignSuccess() }}
      </div>

      <!-- Organization Tree -->
      <div class="section org-tree-section">
        <div class="org-tree">
          <div *ngIf="getVisibleTopLevelNodes().length === 0" class="no-data">
            No team structure available yet.
          </div>

          <ng-container *ngFor="let topNode of getVisibleTopLevelNodes(); trackBy: trackByUserId">
            <div class="tree-level manager-level">
              <div class="manager-node">
                <div class="node-header">{{ getNodeIcon(topNode) }}</div>
                <div class="node-content">
                  <h3>{{ topNode.firstName || '' }} {{ topNode.lastName || '' }}</h3>
                  <p class="role-label">{{ getRoleLabel(topNode) }}</p>
                  <small>{{ topNode.username }}</small>
                  <span *ngIf="getRoleLabel(topNode).toUpperCase() === 'MANAGER' || getRoleLabel(topNode).toUpperCase() === 'SUPERVISOR'" class="staff-count">
                    {{ countDirectStaffForNode(topNode) }} staff
                  </span>
                </div>
              </div>
              <div class="tree-connector-down"></div>
            </div>

            <div class="tree-level supervisors-level" *ngIf="getChildrenForNode(topNode).length > 0">
              <div class="supervisors-container">
                <div *ngFor="let child of getChildrenForNode(topNode); trackBy: trackByUserId" class="supervisor-branch">
                  <div class="supervisor-node">
                    <div class="node-header">{{ getNodeIcon(child) }}</div>
                    <div class="node-content">
                      <h4>{{ child.firstName || '' }} {{ child.lastName || '' }}</h4>
                      <p class="role-label">{{ getRoleLabel(child) }}</p>
                      <small>{{ child.username }}</small>
                      <span class="staff-count">{{ countDirectStaffForNode(child) }} staff</span>
                    </div>
                  </div>

                  <div *ngIf="getChildrenForNode(child).length > 0" class="staff-container">
                    <div class="tree-connector-down-small"></div>
                    <div class="staff-grid">
                      <div *ngFor="let staffMember of getChildrenForNode(child); trackBy: trackByUserId" class="staff-node">
                        <div class="node-header">👷</div>
                        <div class="node-content">
                          <span class="staff-name">{{ staffMember.firstName || '' }} {{ staffMember.lastName || '' }}</span>
                          <small>{{ staffMember.username }}</small>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div *ngIf="getChildrenForNode(child).length === 0" class="no-staff-message">
                    No staff assigned
                  </div>
                </div>
              </div>
            </div>
          </ng-container>
        </div>
      </div>

      <div class="section">
        <h2>All Staff Members</h2>
        <button (click)="loadStaff()" [disabled]="isLoading()">
          {{ isLoading() ? 'Loading...' : 'Refresh Staff List' }}
        </button>

        <div *ngIf="staff().length === 0 && !isLoading()" class="info">
          No staff members found.
        </div>

        <div *ngIf="staff().length > 0" class="staff-table">
          <table>
            <thead>
              <tr>
                <th>Username</th>
                <th>Name</th>
                <th>Email</th>
                <th>Role</th>
                <th>Supervisor</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let member of staff(); trackBy: trackByUserId">
                <td>{{ member.username }}</td>
                <td>{{ member.firstName || '' }} {{ member.lastName || '' }}</td>
                <td>{{ member.email }}</td>
                <td>{{ member.baseRole }}</td>
                <td>{{ getSupervisorDisplay(member.supervisorId) }}</td>
                <td>
                  <button type="button" (click)="loadStaffTasksForUser(member)">View Tasks</button>
                  <button type="button" (click)="selectStaffForAssignment(member)">Assign Supervisor</button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div class="section" *ngIf="selectedTaskStaff()">
        <h2>Tasks for {{ selectedTaskStaff()?.firstName || selectedTaskStaff()?.username }}</h2>
        <p *ngIf="!isLoadingTasks() && selectedStaffTasks().length === 0 && !taskError()">No tasks assigned to this staff member yet.</p>
        <p *ngIf="isLoadingTasks()">Loading tasks...</p>
        <span class="error" *ngIf="taskError()">{{ taskError() }}</span>

        <ul *ngIf="selectedStaffTasks().length > 0" class="task-list">
          <li *ngFor="let task of selectedStaffTasks()">
            <div class="task-header">
              <strong>{{ task.title }}</strong>
              <span class="task-status">{{ task.status || 'UNKNOWN' }}</span>
            </div>
            <p>{{ task.description || 'No details provided.' }}</p>
            <small>Due: {{ task.dueDate ? (task.dueDate | date:'shortDate') : 'No due date' }}</small>
          </li>
        </ul>
      </div>

        <div class="section">
        <h2>Assign Supervisor</h2>
        
        <div *ngIf="selectedStaff()" class="current-assignment">
          <div class="assignment-info">
            <h4>Selected Staff Member</h4>
            <div class="staff-detail">
              <span class="label">Name:</span>
              <span class="value">{{ selectedStaff()?.firstName }} {{ selectedStaff()?.lastName }}</span>
            </div>
            <div class="staff-detail">
              <span class="label">Username:</span>
              <span class="value">{{ selectedStaff()?.username }}</span>
            </div>
            <div class="staff-detail">
              <span class="label">Current Supervisor:</span>
              <span class="value current-supervisor">{{ getSupervisorDisplay(selectedStaff()?.supervisorId) }}</span>
            </div>
          </div>
        </div>

        <form [formGroup]="assignForm" (ngSubmit)="onAssignSupervisor()">
          <div class="form-row">
              <div class="form-group">
                <label>Select Staff Member *</label>
                <select formControlName="staffId" (click)="loadStaff()" (change)="onStaffSelectionChange()">
                  <option value="">Choose a Staff Member ({{ unassignedStaff().length }} available)</option>
                  <option *ngFor="let member of unassignedStaff(); trackBy: trackByUserId" [value]="member._id || member.id || ''">
                    👷 {{ member.firstName || '' }} {{ member.lastName || '' }} ({{ member.username }})
                  </option>
                </select>
                <span class="error" *ngIf="assignForm.get('staffId')?.invalid && assignForm.get('staffId')?.touched">
                  Please select a staff member
                </span>
                <span class="info" *ngIf="assignForm.get('supervisorId')?.value && !isLoadingSupervisorStaff() && supervisorSpecificStaff().length === 0">
                  No staff found for the selected supervisor.
                </span>
              </div>
              <div class="form-group">
                <label>Select Supervisor *</label>
                <select formControlName="supervisorId" (click)="loadSupervisors()" (change)="onSupervisorSelectionChange()">
                  <option value="">Choose a Supervisor ({{ supervisors().length }} available)</option>
                  <option *ngFor="let supervisor of supervisors(); trackBy: trackByUserId" [value]="supervisor._id || supervisor.id || ''">
                    👤 {{ supervisor.firstName || '' }} {{ supervisor.lastName || '' }} ({{ supervisor.username }})
                    - {{ countSupervisorStaff(resolveUserId(supervisor)) }} staff assigned
                  </option>
                </select>
                <span class="error" *ngIf="assignForm.get('supervisorId')?.invalid && assignForm.get('supervisorId')?.touched">
                  Please select a supervisor
                </span>
              </div>
          </div>

          <div class="form-actions">
            <button type="submit" [disabled]="assignForm.invalid || isAssigning()">
              {{ isAssigning() ? 'Assigning...' : 'Assign Supervisor' }}
            </button>
            <button type="button" (click)="cancelAssignment()" class="cancel-btn">Cancel</button>
          </div>
        </form>
      </div>
    </div>
  `,
  styles: [`
    .manager-staff-container {
      padding: 20px;
      max-width: 1000px;
      margin: 0 auto;
      display: flex;
      flex-direction: column;
      align-items: center;
      min-height: 100vh;
    }

    h1 {
      color: #333;
      margin-bottom: 30px;
      text-align: center;
      width: 100%;
    }

    h2 {
      color: #555;
      margin-bottom: 20px;
      text-align: center;
    }

    h3, h4 {
      margin: 0;
      color: #333;
    }

    .section {
      background: rgba(250, 245, 235, 0.85);
      backdrop-filter: blur(10px);
      border: 1px solid rgba(220, 200, 170, 0.4);
      padding: 30px;
      margin: 0 auto 20px;
      border-radius: 12px;
      width: 100%;
      max-width: 900px;
      box-sizing: border-box;
      align-self: center;
      box-shadow: 0 8px 32px rgba(31, 38, 135, 0.15);
    }

    .section form {
      width: 100%;
      margin: 0 auto;
    }

    .org-tree-section {
      padding: 40px 30px;
    }

    .org-tree {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 40px;
    }

    .tree-level {
      width: 100%;
      display: flex;
      flex-direction: column;
      align-items: center;
    }

    .manager-level {
      margin-bottom: 20px;
    }

    .manager-node {
      background: rgba(25, 118, 210, 0.1);
      border: 2px solid #1976d2;
      border-radius: 12px;
      padding: 20px 30px;
      display: flex;
      align-items: center;
      gap: 15px;
      max-width: 350px;
      box-shadow: 0 4px 15px rgba(25, 118, 210, 0.2);
    }

    .tree-connector-down {
      width: 2px;
      height: 40px;
      background: linear-gradient(to bottom, #1976d2, transparent);
      margin: 0 0 20px 0;
    }

    .tree-connector-down-small {
      width: 2px;
      height: 20px;
      background: linear-gradient(to bottom, #666, transparent);
      margin: 0 0 15px 0;
    }

    .supervisors-level {
      width: 100%;
    }

    .supervisors-container {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
      gap: 30px;
      width: 100%;
      justify-items: center;
    }

    .supervisor-branch {
      display: flex;
      flex-direction: column;
      align-items: center;
      width: 100%;
      max-width: 320px;
    }

    .supervisor-node {
      background: rgba(156, 39, 176, 0.08);
      border: 2px solid #9c27b0;
      border-radius: 10px;
      padding: 15px 20px;
      width: 100%;
      box-shadow: 0 3px 10px rgba(156, 39, 176, 0.15);
    }

    .staff-container {
      display: flex;
      flex-direction: column;
      align-items: center;
      width: 100%;
      margin-top: 15px;
    }

    .staff-grid {
      display: flex;
      flex-direction: column;
      gap: 10px;
      width: 100%;
    }

    .staff-node {
      background: rgba(76, 175, 80, 0.08);
      border: 1px solid rgba(76, 175, 80, 0.5);
      border-radius: 8px;
      padding: 12px 15px;
      display: flex;
      align-items: center;
      gap: 10px;
      width: 100%;
    }

    .node-header {
      font-size: 28px;
      flex-shrink: 0;
    }

    .node-content {
      flex: 1;
      text-align: left;
    }

    .node-content h3 {
      font-size: 18px;
      margin: 0 0 5px 0;
      color: #1976d2;
    }

    .node-content h4 {
      font-size: 16px;
      margin: 0 0 4px 0;
      color: #9c27b0;
    }

    .role-label {
      font-size: 12px;
      color: #666;
      margin: 0;
      font-weight: 500;
    }

    .staff-name {
      display: block;
      font-weight: 500;
      color: #333;
      font-size: 14px;
    }

    .staff-count {
      display: inline-block;
      background: rgba(25, 118, 210, 0.15);
      color: #1976d2;
      padding: 3px 8px;
      border-radius: 12px;
      font-size: 12px;
      font-weight: 600;
      margin-top: 5px;
    }

    .no-staff-message {
      color: #999;
      font-size: 13px;
      font-style: italic;
      margin-top: 10px;
      padding: 8px;
      text-align: center;
    }

    .no-data {
      text-align: center;
      color: #666;
      padding: 30px;
      font-size: 16px;
    }

    .error-message {
      background: #f8d7da;
      color: #721c24;
      padding: 1rem;
      border-radius: 4px;
      margin-bottom: 1rem;
      max-width: 900px;
      width: 100%;
    }

    .success-message {
      background: #d4edda;
      color: #155724;
      padding: 1rem;
      border-radius: 4px;
      margin-bottom: 1rem;
      max-width: 900px;
      width: 100%;
    }

    .form-row {
      display: flex;
      gap: 1rem;
      margin-bottom: 1rem;
    }

    .form-group {
      flex: 1;
    }

    label {
      display: block;
      margin-bottom: 0.5rem;
      font-weight: 500;
      color: #333;
    }

    input, select, textarea {
      width: 100%;
      padding: 10px 12px;
      border: 1px solid rgba(200, 180, 150, 0.5);
      border-radius: 6px;
      font-size: 14px;
      background: rgba(255, 255, 255, 0.6);
      backdrop-filter: blur(5px);
    }

    input:focus, select:focus, textarea:focus {
      outline: none;
      border-color: #1976d2;
      background: rgba(255, 255, 255, 0.9);
      box-shadow: 0 0 8px rgba(25, 118, 210, 0.3);
    }

    textarea {
      resize: vertical;
    }

    .current-assignment {
      background: rgba(25, 118, 210, 0.08);
      border: 1px solid rgba(25, 118, 210, 0.3);
      border-radius: 8px;
      padding: 15px;
      margin-bottom: 20px;
    }

    .assignment-info h4 {
      margin: 0 0 10px 0;
      color: #1976d2;
      font-size: 14px;
      font-weight: 600;
      text-transform: uppercase;
    }

    .staff-detail {
      display: flex;
      justify-content: space-between;
      padding: 8px 0;
      border-bottom: 1px solid rgba(25, 118, 210, 0.15);
      font-size: 14px;
    }

    .staff-detail:last-child {
      border-bottom: none;
    }

    .staff-detail .label {
      font-weight: 600;
      color: #333;
      min-width: 150px;
    }

    .staff-detail .value {
      color: #555;
    }

    .current-supervisor {
      background: rgba(76, 175, 80, 0.15);
      color: #2e7d32;
      padding: 2px 8px;
      border-radius: 4px;
      font-weight: 500;
    }

    .form-actions {
      display: flex;
      gap: 10px;
      margin-top: 20px;
    }

    button {
      background: #1976d2;
      color: white;
      padding: 10px 20px;
      border: none;
      border-radius: 6px;
      cursor: pointer;
      font-size: 14px;
      font-weight: 600;
      transition: all 0.3s ease;
      flex: 1;
    }

    button:hover:not(:disabled) {
      background: #1565c0;
      box-shadow: 0 4px 12px rgba(25, 118, 210, 0.4);
    }

    button:disabled {
      background: #cccccc;
      cursor: not-allowed;
    }

    .cancel-btn {
      background: #757575;
      flex: 1;
    }

    .cancel-btn:hover:not(:disabled) {
      background: #616161;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
    }

    .error {
      color: #dc3545;
      font-size: 0.875rem;
      margin-top: 0.25rem;
    }

    .info {
      color: #666;
      padding: 1rem;
      text-align: center;
    }

    small {
      display: block;
      color: #999;
      font-size: 12px;
      margin-top: 3px;
    }

    .staff-table {
      overflow-x: auto;
    }

    table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 1rem;
    }

    thead {
      background: rgba(25, 118, 210, 0.1);
    }

    th {
      padding: 1rem;
      text-align: left;
      font-weight: 600;
      color: #333;
      border-bottom: 2px solid rgba(25, 118, 210, 0.3);
    }

    td {
      padding: 0.75rem 1rem;
      border-bottom: 1px solid rgba(200, 200, 200, 0.3);
    }

    tr:hover {
      background: rgba(250, 245, 235, 0.5);
    }
  `]
})
export class ManagerStaffComponent implements OnInit {
  assignForm!: FormGroup;

  currentUser = signal<User | null>(null);
  managers = signal<User[]>([]);
  staff = signal<User[]>([]);
  supervisors = signal<User[]>([]);
  supervisorSpecificStaff = signal<User[]>([]);
  selectedStaff = signal<User | null>(null);
  selectedTaskStaff = signal<User | null>(null);
  selectedStaffTasks = signal<Task[]>([]);

  isLoading = signal(false);
  isAssigning = signal(false);
  isLoadingTasks = signal(false);
  isLoadingSupervisorStaff = signal(false);

  assignSuccess = signal('');
  assignError = signal('');
  loadError = signal('');
  taskError = signal('');

  /**
   * Get available supervisors for assignment
   */
  getUnassignedSupervisors(): User[] {
    return this.supervisors();
  }

  constructor(
    private authService: AuthService,
    private userService: UserService,
    private taskService: TaskService,
    private fb: FormBuilder
  ) {
    this.assignForm = this.fb.group({
      staffId: ['', Validators.required],
      supervisorId: ['', Validators.required]
    });
  }

  isSupervisorIdString(supervisorId: any): boolean {
    return typeof supervisorId === 'string';
  }

  getSupervisorDisplay(supervisorId: any): string {
    if (!supervisorId) return 'Unassigned';

    const resolvedId = this.resolveSupervisorId(supervisorId);
    if (!resolvedId) return 'Unassigned';

    const supervisor = this.supervisors().find(s => this.resolveUserId(s) === resolvedId);
    if (supervisor) {
      return `${supervisor.firstName || ''} ${supervisor.lastName || ''}`.trim() || supervisor.username;
    }

    return typeof supervisorId === 'string' ? 'Assigned (ID Only)' : (supervisorId.username || 'Unassigned');
  }

  resolveUserId(user: User): string {
    return user._id || user.id || '';
  }

  resolveManagerId(user: any): string {
    if (!user) return '';
    if (typeof user === 'string') return user;
    return user.managerId || user._managerId || '';
  }

  resolveSupervisorId(supervisorId: any): string {
    if (!supervisorId) return '';
    if (typeof supervisorId === 'string') return supervisorId;
    return supervisorId._id || supervisorId.id || '';
  }

  getCurrentUserRole(): string {
    return this.authService.getEffectiveRole();
  }

  getRoleLabel(user: User): string {
    return user.baseRole || 'STAFF';
  }

  getNodeIcon(user: User): string {
    switch (user.baseRole) {
      case 'TECH_ADMIN':
        return '👔';
      case 'MANAGER':
        return '👔';
      case 'SUPERVISOR':
        return '👤';
      default:
        return '👷';
    }
  }

  getVisibleTopLevelNodes(): User[] {
    const role = this.getCurrentUserRole();

    if (role === 'TECH_ADMIN') {
      return this.managers();
    }

    if (role === 'MANAGER') {
      return this.currentUser() ? [this.currentUser()!] : [];
    }

    if (role === 'SUPERVISOR') {
      return this.currentUser() ? [this.currentUser()!] : [];
    }

    return [];
  }

  getChildrenForNode(node: User): User[] {
    const nodeId = this.resolveUserId(node);
    const role = node.baseRole || this.getCurrentUserRole();

    if (role === 'TECH_ADMIN' || role === 'MANAGER') {
      return this.supervisors().filter(supervisor => this.resolveManagerId(supervisor) === nodeId);
    }

    if (role === 'SUPERVISOR') {
      return this.staff().filter(member => this.resolveSupervisorId(member.supervisorId) === nodeId);
    }

    return [];
  }

  countDirectStaffForNode(node: User): number {
    if (node.baseRole === 'SUPERVISOR') {
      return this.getChildrenForNode(node).length;
    }

    if (node.baseRole === 'MANAGER' || node.baseRole === 'TECH_ADMIN') {
      return this.supervisors()
        .filter(supervisor => this.resolveManagerId(supervisor) === this.resolveUserId(node))
        .reduce((total, supervisor) => total + this.getChildrenForNode(supervisor).length, 0);
    }

    return 0;
  }

  getSupervisorStaff(supervisorId: string): User[] {
    return this.staff().filter(member => this.resolveSupervisorId(member.supervisorId) === supervisorId);
  }

  unassignedStaff(): User[] {
    return this.staff().filter(member => !this.resolveSupervisorId(member.supervisorId));
  }

  countSupervisorStaff(supervisorId: string): number {
    return this.getSupervisorStaff(supervisorId).length;
  }

  trackByUserId = (index: number, item: User): string => {
    return this.resolveUserId(item) || `${item.username}_${index}`;
  };

  loadStaffTasksForUser(staffMember: User): void {
    this.selectedTaskStaff.set(staffMember);
    this.taskError.set('');
    this.selectedStaffTasks.set([]);
    this.isLoadingTasks.set(true);

    const staffId = this.resolveUserId(staffMember);
    if (!staffId) {
      this.taskError.set('Unable to load tasks for this staff member.');
      this.isLoadingTasks.set(false);
      return;
    }

    this.taskService.getTasksForUser(staffId).subscribe({
      next: (response: any) => {
        if (response.success) {
          this.selectedStaffTasks.set(response.tasks || []);
        } else {
          this.taskError.set(response.message || 'No tasks found for this staff member.');
        }
        this.isLoadingTasks.set(false);
      },
      error: (error: any) => {
        this.taskError.set('Failed to load tasks: ' + (error.error?.message || error.message));
        this.isLoadingTasks.set(false);
      }
    });
  }

  ngOnInit(): void {
    this.authService.currentUser.subscribe((user: User | null) => {
      this.currentUser.set(user);
      if (user) {
        setTimeout(() => {
          this.loadManagers();
          this.loadSupervisors();
          this.loadStaff();
        });
      }
    });
  }

  loadManagers(): void {
    this.userService.getUsersByRole('MANAGER').subscribe({
      next: (response: any) => {
        if (response.success) {
          this.managers.set(response.users || response.managers || []);
        }
      },
      error: (error: any) => {
        console.error('Failed to load managers:', error);
        this.managers.set([]);
      }
    });
  }

  loadStaff(): void {
    this.isLoading.set(true);
    this.loadError.set('');
    this.userService.getUsersByRole('STAFF').subscribe({
      next: (response: any) => {
        if (response.success) {
          this.staff.set(response.users || response.staff || []);
        }
        this.isLoading.set(false);
      },
      error: (error: any) => {
        this.loadError.set('Failed to load staff: ' + (error.error?.message || error.message));
        this.isLoading.set(false);
      }
    });
  }

  loadSupervisors(): void {
    const managerId = this.currentUser() ? this.resolveUserId(this.currentUser()!) : '';
    this.userService.getUsersByRole('SUPERVISOR').subscribe({
      next: (response: any) => {
        if (response.success) {
          this.supervisors.set(response.users || response.supervisors || []);
        }
      },
      error: (error: any) => {
        console.error('Failed to load supervisors by role, falling back to manager-scoped endpoint:', error);
        if (managerId) {
          this.userService.getSupervisorsUnderManager(managerId).subscribe({
            next: (res: any) => {
              if (res.success) this.supervisors.set(res.supervisors || res.users || []);
            },
            error: (err: any) => console.error('Failed to load supervisors fallback:', err)
          });
        }
      }
    });
  }

  /**
   * When a supervisor is selected in the assign form, load staff under that supervisor
   */
  onSupervisorSelectionChange(): void {
    const supervisorId = this.assignForm.get('supervisorId')?.value;
    if (!supervisorId) {
      this.supervisorSpecificStaff.set([]);
      return;
    }
    this.loadStaffForSupervisor(supervisorId);
  }

  loadStaffForSupervisor(supervisorId: string): void {
    this.isLoadingSupervisorStaff.set(true);
    this.supervisorSpecificStaff.set([]);
    this.userService.getStaffUnderSupervisor(supervisorId).subscribe({
      next: (response: any) => {
        if (response.success) {
          this.supervisorSpecificStaff.set(response.staff || response.users || []);
        } else {
          this.supervisorSpecificStaff.set([]);
        }
        this.isLoadingSupervisorStaff.set(false);
      },
      error: (error: any) => {
        console.error('Failed to load staff for supervisor:', error);
        this.supervisorSpecificStaff.set([]);
        this.isLoadingSupervisorStaff.set(false);
      }
    });
  }

  selectStaffForAssignment(staffMember: User): void {
    this.selectedStaff.set(staffMember);
    this.assignForm.patchValue({ staffId: this.resolveUserId(staffMember), supervisorId: '' });
    this.assignSuccess.set('');
    this.assignError.set('');
  }

  onStaffSelectionChange(): void {
    const staffId = this.assignForm.get('staffId')?.value;
    if (staffId) {
      const selectedMember = this.staff().find(s => (s._id || s.id) === staffId);
      if (selectedMember) {
        this.selectedStaff.set(selectedMember);
      }
    } else {
      this.selectedStaff.set(null);
    }
    this.assignSuccess.set('');
    this.assignError.set('');
  }

  cancelAssignment(): void {
    this.selectedStaff.set(null);
    this.assignForm.reset();
  }

  onAssignSupervisor(): void {
    if (this.assignForm.invalid) return;

    this.isAssigning.set(true);
    this.assignSuccess.set('');
    this.assignError.set('');

    const supervisorId = this.assignForm.get('supervisorId')?.value;
    const staffId = this.assignForm.get('staffId')?.value;

    this.userService.assignSupervisor(staffId, supervisorId).subscribe({
      next: (response: any) => {
        if (response.success) {
          this.assignSuccess.set('Supervisor assigned successfully!');
          setTimeout(() => {
            this.cancelAssignment();
            this.loadStaff();
            this.loadSupervisors();
          }, 1500);
        }
        this.isAssigning.set(false);
      },
      error: (error: any) => {
        this.assignError.set('Failed to assign supervisor: ' + (error.error?.message || error.message));
        this.isAssigning.set(false);
      }
    });
  }
}
