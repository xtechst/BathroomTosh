import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { AuthService } from '../../../services/auth.service';
import { UserService } from '../../../services/user.service';
import { TaskService } from '../../../services/task.service';
import { User } from '../../../models';

@Component({
  selector: 'app-acting-roles',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  template: `
    <div class="form-center-viewport">
      <div class="center-card acting-container">
      <h1>Manager Task Assignment</h1>
      
      <div *ngIf="currentUser()" class="manager-info">
        <p>Manager: <strong>{{ currentUser()!.firstName }} {{ currentUser()!.lastName }}</strong></p>
      </div>

      <!-- Create Task Section -->
      <div class="section">
        <h2>Assign Task to Supervisor</h2>
        <form [formGroup]="taskForm" (ngSubmit)="onCreateTask()">
          <div class="form-group">
            <label>Task Title *</label>
            <input type="text" formControlName="title" placeholder="Enter task title" />
            <span class="error" *ngIf="taskForm.get('title')?.invalid && taskForm.get('title')?.touched">
              Title is required
            </span>
          </div>

          <div class="form-group">
            <label>Description</label>
            <textarea formControlName="description" placeholder="Enter task description" rows="3"></textarea>
          </div>

          <div class="form-group">
            <label>Area *</label>
            <select formControlName="area">
              <option value="">Select Area</option>
              <option value="BATHROOM">Bathroom</option>
              <option value="KITCHEN">Kitchen</option>
            </select>
            <span class="error" *ngIf="taskForm.get('area')?.invalid && taskForm.get('area')?.touched">
              Area is required
            </span>
          </div>

          <div class="form-group">
            <label>Priority</label>
            <select formControlName="priority">
              <option value="LOW">Low</option>
              <option value="MEDIUM">Medium</option>
              <option value="HIGH">High</option>
            </select>
          </div>

              <div class="form-group">
            <label>Assign To Supervisor *</label>
            <select formControlName="assignedTo" (change)="onSupervisorChange()">
              <option value="">Select Supervisor</option>
              <option *ngFor="let supervisor of supervisorList()" [value]="supervisor._id || supervisor.id">
                {{ supervisor.firstName }} {{ supervisor.lastName }}
              </option>
            </select>
            <span class="error" *ngIf="taskForm.get('assignedTo')?.invalid && taskForm.get('assignedTo')?.touched">
              Supervisor is required
            </span>
          </div>

          <div class="form-group">
            <label>Assign To Staff</label>
            <select formControlName="assignedStaff">
              <option value="">Select Staff</option>
              <option *ngFor="let staff of staffList()" [value]="staff._id || staff.id">
                {{ staff.firstName }} {{ staff.lastName }}
              </option>
            </select>
            <span class="error" *ngIf="taskForm.get('assignedStaff')?.invalid && taskForm.get('assignedStaff')?.touched">
              Please select a staff member when assigning to staff
            </span>
            <div class="info" *ngIf="!taskForm.get('assignedTo')?.value">
              Select a supervisor first to see the staff assigned to them.
            </div>
            <div class="info" *ngIf="taskForm.get('assignedTo')?.value && !isLoadingStaff() && staffList().length === 0">
              No staff found for the selected supervisor.
            </div>
          </div>

          <div class="form-group">
            <label>Due Date</label>
            <input type="date" formControlName="dueDate" />
          </div>

          <button type="submit" [disabled]="taskForm.invalid || isCreatingTask() || isLoadingSupervisors()">
            {{ isCreatingTask() ? 'Creating...' : 'Assign Task' }}
          </button>

          <span class="success" *ngIf="createTaskSuccess()">{{ createTaskSuccess() }}</span>
          <span class="error" *ngIf="createTaskError()">{{ createTaskError() }}</span>
        </form>
      </div>

      <!-- Acting Roles & Hierarchy Info -->
      <div class="section info">
        <h3>Manager Responsibilities</h3>
        <ul>
          <li>✓ Assign tasks to supervisors under your management</li>
          <li>✓ Monitor supervisor assignments to staff</li>
          <li>✓ Approve leave requests from supervisors</li>
          <li>✓ Delegate acting roles with time-bound windows</li>
          <li>✓ View all staff tasks across your supervisors</li>
        </ul>
        
        <h3>Hierarchy</h3>
        <div class="hierarchy">
          <div>Manager (You) → Supervisors → Staff</div>
          <p>Managers assign tasks to Supervisors, who then assign them to Staff members.</p>
        </div>
      </div>
      </div>
    </div>
  `,
  styles: [`
    .acting-container {
      padding: 20px;
      max-width: 900px;
      margin: 0 auto;
      display: flex;
      flex-direction: column;
      align-items: center;
      min-height: 100vh;
    }

    h1 {
      color: #333;
      margin-bottom: 20px;
      text-align: center;
      width: 100%;
    }

    h2, h3 {
      color: #555;
      margin-bottom: 15px;
      font-size: 18px;
    }

    .manager-info {
      background: rgba(227, 242, 253, 0.7);
      border-left: 4px solid #1976d2;
      padding: 12px;
      margin-bottom: 20px;
      border-radius: 8px;
      width: 100%;
      max-width: 800px;
    }

    .manager-info p {
      margin: 0;
      color: #333;
    }

    .section {
      background: rgba(250, 245, 235, 0.85);
      backdrop-filter: blur(10px);
      border: 1px solid rgba(220, 200, 170, 0.4);
      margin: 0 auto;
      padding: 30px;
      border-radius: 12px;
      width: 100%;
      max-width: 800px;
      box-shadow: 0 8px 32px rgba(31, 38, 135, 0.15);
    }

    .section.info {
      background: rgba(240, 247, 255, 0.7);
      border-color: rgba(204, 229, 255, 0.4);
    }

    .form-group {
      margin-bottom: 15px;
      display: flex;
      flex-direction: column;
    }

    label {
      font-weight: bold;
      margin-bottom: 8px;
      color: #333;
    }

    input, select, textarea {
      padding: 10px 12px;
      border: 1px solid rgba(200, 180, 150, 0.5);
      border-radius: 6px;
      font-size: 14px;
      font-family: inherit;
      background: rgba(255, 255, 255, 0.6);
      backdrop-filter: blur(5px);
    }

    input:focus, select:focus, textarea:focus {
      outline: none;
      border-color: #1976d2;
      background: rgba(255, 255, 255, 0.9);
      box-shadow: 0 0 8px rgba(25, 118, 210, 0.3);
    }

    button {
      padding: 12px 20px;
      background-color: #1976d2;
      color: white;
      border: none;
      border-radius: 6px;
      cursor: pointer;
      margin-top: 15px;
      font-size: 14px;
      font-weight: 600;
      transition: all 0.3s ease;
    }

    button:hover:not(:disabled) {
      background-color: #1565c0;
      box-shadow: 0 4px 12px rgba(25, 118, 210, 0.4);
    }

    button:disabled {
      background-color: #cccccc;
      cursor: not-allowed;
    }

    .error {
      color: #d32f2f;
      font-size: 14px;
      margin-top: 5px;
    }

    .success {
      color: #388e3c;
      font-size: 14px;
      margin-top: 10px;
      display: inline-block;
      padding: 8px 12px;
      background: rgba(56, 142, 60, 0.1);
      border-radius: 4px;
    }

    .info {
      font-size: 13px;
      color: #666;
      margin-top: 8px;
      padding: 8px;
      background: rgba(25, 118, 210, 0.05);
      border-radius: 4px;
      border-left: 3px solid #1976d2;
    }

    .info ul {
      list-style: none;
      padding: 0;
      margin: 0 0 20px 0;
    }

    .info li {
      padding: 10px 0;
      color: #333;
      border-bottom: 1px solid rgba(200, 200, 200, 0.3);
    }

    .info li:last-child {
      border-bottom: none;
    }

    .hierarchy {
      background: rgba(255, 255, 255, 0.5);
      backdrop-filter: blur(5px);
      padding: 15px;
      border-radius: 8px;
      border: 1px solid rgba(204, 229, 255, 0.4);
      margin-top: 10px;
    }

    .hierarchy div {
      font-weight: bold;
      color: #1976d2;
      margin-bottom: 8px;
      font-size: 16px;
    }

    .hierarchy p {
      margin: 5px 0 0 0;
      color: #666;
      font-style: italic;
    }
  `]
})
export class ActingRolesComponent implements OnInit {
  taskForm!: FormGroup;

  currentUser = signal<User | null>(null);
  supervisorList = signal<User[]>([]);
  staffList = signal<User[]>([]);

  isCreatingTask = signal(false);
  isLoadingSupervisors = signal(false);
  isLoadingStaff = signal(false);

  createTaskSuccess = signal('');
  createTaskError = signal('');

  constructor(
    private authService: AuthService,
    private userService: UserService,
    private taskService: TaskService,
    private fb: FormBuilder
  ) {
    this.taskForm = this.fb.group({
      title: ['', Validators.required],
      description: [''],
      area: ['', Validators.required],
      priority: ['MEDIUM'],
      assignedTo: ['', Validators.required],
      assignedStaff: [{ value: '', disabled: true }],
      dueDate: ['']
    });
  }

  ngOnInit(): void {
    this.authService.currentUser.subscribe((user: User | null) => {
      this.currentUser.set(user);
      if (user) {
        this.loadSupervisors();
      }
    });
  }

  onSupervisorChange(): void {
    const supervisorId = this.taskForm.get('assignedTo')?.value;
    if (!supervisorId) {
      this.staffList.set([]);
      this.taskForm.get('assignedStaff')?.disable();
      this.taskForm.get('assignedStaff')?.setValue('');
      return;
    }

    this.loadStaffForSupervisor(supervisorId);
  }

  loadStaffForSupervisor(supervisorId: string): void {
    this.isLoadingStaff.set(true);
    this.staffList.set([]);
    const assignedStaffControl = this.taskForm.get('assignedStaff');
    assignedStaffControl?.disable();
    assignedStaffControl?.setValue('');

    this.userService.getStaffUnderSupervisor(supervisorId).subscribe({
      next: (response: any) => {
        if (response.success) {
          this.staffList.set(response.staff || []);
          if ((response.staff || []).length > 0) {
            assignedStaffControl?.enable();
          }
        }
        this.isLoadingStaff.set(false);
      },
      error: (error: any) => {
        console.error('Failed to load staff for supervisor:', error);
        assignedStaffControl?.disable();
        this.isLoadingStaff.set(false);
      }
    });
  }

  loadSupervisors(): void {
    this.isLoadingSupervisors.set(true);

    this.userService.getUsersByRole('SUPERVISOR').subscribe({
      next: (response: any) => {
        if (response.success) {
          this.supervisorList.set(response.users || response.supervisors || []);
        }
        this.isLoadingSupervisors.set(false);
      },
      error: (error: any) => {
        console.error('Failed to load supervisors by role, falling back to getAllSupervisors():', error);
        this.userService.getAllSupervisors().subscribe({
          next: (res: any) => {
            if (res.success) this.supervisorList.set(res.users || res.supervisors || []);
            this.isLoadingSupervisors.set(false);
          },
          error: (err: any) => {
            console.error('Failed to load supervisors fallback:', err);
            this.isLoadingSupervisors.set(false);
          }
        });
      }
    });
  }

  onCreateTask(): void {
    if (this.taskForm.invalid) return;

    this.isCreatingTask.set(true);
    this.createTaskSuccess.set('');
    this.createTaskError.set('');

    const taskData = this.taskForm.value;

    this.taskService.createTask(taskData).subscribe({
      next: (response: any) => {
        if (response.success) {
          this.createTaskSuccess.set('Task assigned to supervisor successfully!');
          this.taskForm.reset({
            priority: 'MEDIUM',
            area: '',
            assignedTo: '',
            assignedStaff: '',
            dueDate: ''
          });
          this.taskForm.get('assignedStaff')?.disable();
          this.staffList.set([]);
          setTimeout(() => {
            this.createTaskSuccess.set('');
          }, 3000);
        }
        this.isCreatingTask.set(false);
      },
      error: (error: any) => {
        const errorMsg = error.error?.message || error.message || 'Failed to assign task';
        this.createTaskError.set(errorMsg);
        this.isCreatingTask.set(false);
      }
    });
  }
}
