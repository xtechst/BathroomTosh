import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { AuthService } from '../../../services/auth.service';
import { UserService } from '../../../services/user.service';
import { TaskService } from '../../../services/task.service';
import { User, Task } from '../../../models';

@Component({
  selector: 'app-assignments',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  template: `
    <div class="form-center-viewport">
      <div class="center-card assignments-container">
      <h1>Assign Tasks to Staff</h1>
      
      <div *ngIf="currentUser()" class="supervisor-info">
        <p>Supervisor: <strong>{{ currentUser()!.firstName }} {{ currentUser()!.lastName }}</strong></p>
      </div>

      <!-- Create Task Section -->
      <div class="section">
        <h2>Create New Task</h2>
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
            <label>Assign To *</label>
            <select formControlName="assignedTo" [disabled]="isLoadingStaff() || staffList().length === 0">
              <option value="">Select Staff Member</option>
              <option *ngFor="let staff of staffList()" [value]="staff._id || staff.id">
                {{ staff.firstName }} {{ staff.lastName }}
              </option>
            </select>
            <span class="error" *ngIf="taskForm.get('assignedTo')?.invalid && taskForm.get('assignedTo')?.touched">
              Staff member is required
            </span>
            <span class="info" *ngIf="!isLoadingStaff() && staffList().length === 0">
              No staff members are currently assigned to you. Please contact your manager to assign staff.
            </span>
            <span class="info" *ngIf="isLoadingStaff()">
              Loading assigned staff...
            </span>
          </div>

          <div class="form-group">
            <label>Due Date</label>
            <input type="date" formControlName="dueDate" />
          </div>

          <button type="submit" [disabled]="taskForm.invalid || isCreatingTask()">
            {{ isCreatingTask() ? 'Creating...' : 'Create & Assign Task' }}
          </button>

          <span class="success" *ngIf="createTaskSuccess()">{{ createTaskSuccess() }}</span>
          <span class="error" *ngIf="createTaskError()">{{ createTaskError() }}</span>
        </form>
      </div>

      <!-- Validation Rules -->
      <div class="section rules">
        <h3>Task Assignment Rules</h3>
        <ul>
          <li>✓ You can only assign tasks to your assigned staff members</li>
          <li>✓ Cannot assign tasks on staff approved leave dates</li>
          <li>✓ Cannot assign if original user is in Audit Mode</li>
          <li>✓ Tasks are linked to specific areas (Kitchen, Bathroom)</li>
          <li>✓ Tasks may include checklists with boolean items required for completion</li>
        </ul>
      </div>
      </div>
    </div>
  `,
  styles: [`
    .assignments-container {
      padding: 20px;
      max-width: 800px;
      margin: 0 auto;
    }

    h1 {
      color: #333;
      margin-bottom: 20px;
    }

    h2, h3 {
      color: #555;
      margin-bottom: 15px;
      font-size: 18px;
    }

    .supervisor-info {
      background: #e8f5e9;
      border-left: 4px solid #4CAF50;
      padding: 12px;
      margin-bottom: 20px;
      border-radius: 4px;
    }

    .supervisor-info p {
      margin: 0;
      color: #333;
    }

    .section {
      background: #f9f9f9;
      border: 1px solid #ddd;
      padding: 20px;
      margin: 20px 0;
      border-radius: 4px;
    }

    .section.rules {
      background: #f0f7ff;
      border-color: #cce5ff;
    }

    .form-group {
      margin-bottom: 15px;
      display: flex;
      flex-direction: column;
    }

    label {
      font-weight: bold;
      margin-bottom: 5px;
      color: #333;
    }

    input, select, textarea {
      padding: 8px;
      border: 1px solid #ccc;
      border-radius: 4px;
      font-size: 14px;
      font-family: inherit;
    }

    input:focus, select:focus, textarea:focus {
      outline: none;
      border-color: #4CAF50;
      box-shadow: 0 0 5px rgba(76, 175, 80, 0.3);
    }

    button {
      padding: 10px 15px;
      background-color: #4CAF50;
      color: white;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      margin-top: 10px;
      font-size: 14px;
    }

    button:hover:not(:disabled) {
      background-color: #45a049;
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
    }

    .info {
      color: #555;
      font-size: 13px;
      margin-top: 8px;
      display: block;
    }

    .rules ul {
      list-style: none;
      padding: 0;
      margin: 0;
    }

    .rules li {
      padding: 8px 0;
      color: #333;
      border-bottom: 1px solid #ddd;
    }

    .rules li:last-child {
      border-bottom: none;
    }
  `]
})
export class AssignmentsComponent implements OnInit {
  taskForm!: FormGroup;

  currentUser = signal<User | null>(null);
  staffList = signal<User[]>([]);

  isCreatingTask = signal(false);
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
      dueDate: ['']
    });
  }

  ngOnInit(): void {
    this.authService.currentUser.subscribe((user: User | null) => {
      this.currentUser.set(user);
      if (user) {
        this.loadStaff();
      }
    });
  }

  loadStaff(): void {
    const currentUser = this.currentUser();
    if (!currentUser || !currentUser._id && !currentUser.id) return;

    this.isLoadingStaff.set(true);
    const supervisorId = currentUser._id || currentUser.id || '';

    this.userService.getStaffUnderSupervisor(supervisorId).subscribe({
      next: (response: any) => {
        if (response.success) {
          const staffOnly = (response.staff || []).filter((user: User) => user.baseRole === 'STAFF');
          this.staffList.set(staffOnly);
        }
        this.isLoadingStaff.set(false);
      },
      error: (error: any) => {
        console.error('Failed to load staff:', error);
        this.isLoadingStaff.set(false);
      }
    });
  }

  onCreateTask(): void {
    if (this.taskForm.invalid) return;

    this.isCreatingTask.set(true);
    this.createTaskSuccess.set('');
    this.createTaskError.set('');

    const taskData = this.taskForm.value;

    // Call task service to create task
    // This will be made via the API which validates the role hierarchy
    this.taskService.createTask(taskData).subscribe({
      next: (response: any) => {
        if (response.success) {
          this.createTaskSuccess.set('Task created and assigned successfully!');
          this.taskForm.reset({
            priority: 'MEDIUM',
            area: '',
            assignedTo: ''
          });
          setTimeout(() => {
            this.createTaskSuccess.set('');
          }, 3000);
        }
        this.isCreatingTask.set(false);
      },
      error: (error: any) => {
        const errorMsg = error.error?.message || error.message || 'Failed to create task';
        this.createTaskError.set(errorMsg);
        this.isCreatingTask.set(false);
      }
    });
  }
}
