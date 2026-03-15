import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { UserService } from '../../../services/user.service';
import { TaskService } from '../../../services/task.service';
import { AuthService } from '../../../services/auth.service';
import { User, Task } from '../../../models';

@Component({
  selector: 'app-supervisor-staff',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  template: `
    <div class="supervisor-staff-container">
      <h1>Staff Under My Supervision</h1>

      <!-- Staff List Section -->
      <div class="section">
        <button (click)="loadStaff()" [disabled]="isLoading()">
          {{ isLoading() ? 'Loading...' : 'Refresh Staff List' }}
        </button>

        <span class="error" *ngIf="loadError()">{{ loadError() }}</span>

        <div *ngIf="staff().length > 0" class="staff-table">
          <table>
            <thead>
              <tr>
                <th>Username</th>
                <th>Name</th>
                <th>Email</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let member of staff()">
                <td>{{ member.username }}</td>
                <td>{{ member.firstName || '' }} {{ member.lastName || '' }}</td>
                <td>{{ member.email }}</td>
                <td>{{ member.isActive ? 'Active' : 'Inactive' }}</td>
                <td>
                  <button (click)="selectStaffForTasks(member)">Manage Tasks</button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <p *ngIf="staff().length === 0 && !isLoading()">No staff members assigned to you.</p>
      </div>

      <!-- Add Task Section -->
      <div class="section" *ngIf="selectedStaff()">
        <h2>Add Task for: {{ selectedStaff()?.firstName || '' }} {{ selectedStaff()?.lastName || '' }}</h2>
        <form [formGroup]="taskForm" (ngSubmit)="onAddTask()">
          <div class="form-group">
            <label>Task Title *</label>
            <input type="text" formControlName="title" placeholder="Enter task title" />
            <span class="error" *ngIf="taskForm.get('title')?.invalid && taskForm.get('title')?.touched">
              Title is required
            </span>
          </div>

          <div class="form-group">
            <label>Description</label>
            <textarea formControlName="description" placeholder="Enter task description"></textarea>
          </div>

          <div class="form-group">
            <label>Area *</label>
            <select formControlName="area">
              <option value="">Select Area</option>
              <option value="KITCHEN">Kitchen</option>
              <option value="BATHROOM">Bathroom</option>
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
            <label>Due Date</label>
            <input type="date" formControlName="dueDate" />
          </div>

          <button type="submit" [disabled]="taskForm.invalid || isAddingTask()">
            {{ isAddingTask() ? 'Adding...' : 'Add Task' }}
          </button>

          <span class="success" *ngIf="taskSuccess()">{{ taskSuccess() }}</span>
          <span class="error" *ngIf="taskError()">{{ taskError() }}</span>
        </form>
      </div>

      <!-- Staff Tasks Section -->
      <div class="section" *ngIf="selectedStaff()">
        <h2>Tasks for: {{ selectedStaff()?.firstName || '' }} {{ selectedStaff()?.lastName || '' }}</h2>
        <button (click)="loadStaffTasks()" [disabled]="isLoadingTasks()">
          {{ isLoadingTasks() ? 'Loading...' : 'Refresh Tasks' }}
        </button>

        <div *ngIf="staffTasks().length > 0" class="tasks-table">
          <table>
            <thead>
              <tr>
                <th width="30">✓</th>
                <th>Task Name</th>
                <th>Priority</th>
                <th>Due Date</th>
                <th>Status</th>
                <th>Date Cleaned</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let task of staffTasks()" [class.completed]="task.status === 'COMPLETED'">
                <td class="checkbox-cell">
                  <input 
                    type="checkbox" 
                    [checked]="task.status === 'COMPLETED'"
                    (change)="toggleTaskCompletion(task)"
                    title="Mark as complete"
                  />
                </td>
                <td class="task-name">{{ task.title }}</td>
                <td>
                  <span [class]="'priority-badge priority-' + (task.priority || 'MEDIUM')">
                    {{ task.priority || 'MEDIUM' }}
                  </span>
                </td>
                <td>{{ task.dueDate ? (task.dueDate | date: 'MMM d, yyyy') : 'No due date' }}</td>
                <td>
                  <span [class]="'status-badge status-' + (task.status || 'PENDING')">
                    {{ task.status || 'PENDING' }}
                  </span>
                </td>
                <td>{{ task.completedAt ? (task.completedAt | date: 'MMM d, yyyy') : '-' }}</td>
                <td>
                  <button (click)="deleteTask(task._id || task.id || '')" class="delete-btn">Delete</button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <p *ngIf="staffTasks().length === 0 && !isLoadingTasks()">No tasks for this staff member.</p>
      </div>

      <!-- Close Section Button -->
      <div class="section" *ngIf="selectedStaff()">
        <button (click)="closeSelection()" class="close-btn">Close</button>
      </div>
    </div>
  `,
  styles: [`
    .supervisor-staff-container {
      padding: 20px;
      max-width: 1000px;
      margin: 0 auto;
    }

    .section {
      background: #f9f9f9;
      border: 1px solid #ddd;
      padding: 20px;
      margin: 20px 0;
      border-radius: 4px;
    }

    h1 {
      color: #333;
      margin-bottom: 20px;
    }

    h2 {
      color: #555;
      margin-bottom: 15px;
      font-size: 18px;
    }

    p {
      color: #666;
      margin: 10px 0;
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
      font-family: Arial, sans-serif;
    }

    textarea {
      resize: vertical;
      min-height: 80px;
    }

    input:focus, select:focus, textarea:focus {
      outline: none;
      border-color: #FF9800;
      box-shadow: 0 0 5px rgba(255, 152, 0, 0.3);
    }

    button {
      padding: 10px 15px;
      background-color: #FF9800;
      color: white;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      margin-right: 10px;
      margin-top: 10px;
      font-size: 14px;
    }

    button:hover:not(:disabled) {
      background-color: #F57C00;
    }

    button:disabled {
      background-color: #cccccc;
      cursor: not-allowed;
    }

    .delete-btn {
      background-color: #d32f2f;
      padding: 5px 10px;
      font-size: 12px;
      margin: 0;
    }

    .delete-btn:hover {
      background-color: #b71c1c;
    }

    .close-btn {
      background-color: #666;
      margin-top: 0;
    }

    .close-btn:hover {
      background-color: #555;
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

    .staff-table, .tasks-table {
      margin-top: 15px;
      overflow-x: auto;
    }

    table {
      width: 100%;
      border-collapse: collapse;
      background: white;
    }

    th {
      background-color: #FF9800;
      color: white;
      padding: 12px;
      text-align: left;
    }

    td {
      padding: 12px;
      border-bottom: 1px solid #ddd;
    }

    tr:hover {
      background-color: #f5f5f5;
    }

    table button {
      padding: 5px 10px;
      font-size: 12px;
      margin: 0;
    }

    .checkbox-cell {
      text-align: center;
      padding: 10px 5px;
    }

    .checkbox-cell input[type="checkbox"] {
      width: 18px;
      height: 18px;
      cursor: pointer;
      accent-color: #FF9800;
    }

    .task-name {
      font-weight: 500;
      color: #333;
    }

    tr.completed {
      background-color: #e8f5e9;
      opacity: 0.8;
    }

    tr.completed .task-name {
      text-decoration: line-through;
      color: #999;
    }

    .priority-badge {
      display: inline-block;
      padding: 4px 10px;
      border-radius: 12px;
      font-size: 12px;
      font-weight: bold;
      text-transform: uppercase;
    }

    .priority-HIGH {
      background-color: #ffebee;
      color: #c62828;
    }

    .priority-MEDIUM {
      background-color: #fff3e0;
      color: #e65100;
    }

    .priority-LOW {
      background-color: #e8f5e9;
      color: #2e7d32;
    }

    .status-badge {
      display: inline-block;
      padding: 4px 10px;
      border-radius: 12px;
      font-size: 12px;
      font-weight: bold;
      text-transform: uppercase;
    }

    .status-PENDING {
      background-color: #fff3e0;
      color: #e65100;
    }

    .status-IN_PROGRESS {
      background-color: #e3f2fd;
      color: #1565c0;
    }

    .status-COMPLETED {
      background-color: #e8f5e9;
      color: #2e7d32;
    }

    .status-CANCELLED {
      background-color: #f3e5f5;
      color: #6a1b9a;
    }
  `]
})
export class SupervisorStaffComponent implements OnInit {
  taskForm!: FormGroup;

  staff = signal<User[]>([]);
  staffTasks = signal<Task[]>([]);
  selectedStaff = signal<User | null>(null);

  isLoading = signal(false);
  isLoadingTasks = signal(false);
  isAddingTask = signal(false);
  isUpdatingTask = signal(false);

  taskSuccess = signal('');
  taskError = signal('');
  loadError = signal('');

  constructor(
    private userService: UserService,
    private taskService: TaskService,
    private authService: AuthService,
    private fb: FormBuilder
  ) {
    this.taskForm = this.fb.group({
      title: ['', Validators.required],
      description: [''],
      area: ['', Validators.required],
      priority: ['MEDIUM'],
      dueDate: ['']
    });
  }

  ngOnInit(): void {
    this.loadStaff();
  }

  loadStaff(): void {
    this.isLoading.set(true);
    this.loadError.set('');
    const currentUser = this.authService.getCurrentUser();

    if (currentUser) {
      const userId = currentUser._id || currentUser.id || '';
      this.userService.getStaffUnderSupervisor(userId).subscribe({
        next: (response: any) => {
          if (response.success) {
            this.staff.set(response.staff);
          }
          this.isLoading.set(false);
        },
        error: (error: any) => {
          this.loadError.set('Failed to load staff: ' + (error.error?.message || error.message));
          this.isLoading.set(false);
        }
      });
    }
  }

  selectStaffForTasks(staffMember: User): void {
    this.selectedStaff.set(staffMember);
    this.taskForm.reset({ priority: 'MEDIUM' });
    this.taskSuccess.set('');
    this.taskError.set('');
    this.loadStaffTasks();
  }

  loadStaffTasks(): void {
    if (!this.selectedStaff()) return;

    this.isLoadingTasks.set(true);
    const staffId = this.selectedStaff()?._id || this.selectedStaff()?.id || '';
    this.taskService.getTasksForUser(staffId).subscribe({
      next: (response: any) => {
        if (response.success) {
          this.staffTasks.set(response.tasks);
        }
        this.isLoadingTasks.set(false);
      },
      error: (error: any) => {
        console.error('Failed to load tasks:', error);
        this.isLoadingTasks.set(false);
      }
    });
  }

  onAddTask(): void {
    if (this.taskForm.invalid || !this.selectedStaff()) return;

    this.isAddingTask.set(true);
    this.taskSuccess.set('');
    this.taskError.set('');

    const staffId = this.selectedStaff()?._id || this.selectedStaff()?.id || '';
    const payload = {
      ...this.taskForm.value,
      assignedTo: staffId
    };

    this.taskService.createTask(payload).subscribe({
      next: (response: any) => {
        if (response.success) {
          this.taskSuccess.set('Task added successfully!');
          this.taskForm.reset({ priority: 'MEDIUM' });
          this.loadStaffTasks();
        }
        this.isAddingTask.set(false);
      },
      error: (error: any) => {
        this.taskError.set('Failed to add task: ' + (error.error?.message || error.message));
        this.isAddingTask.set(false);
      }
    });
  }

  deleteTask(taskId: string): void {
    if (!confirm('Are you sure you want to delete this task?')) return;

    this.taskService.deleteTask(taskId).subscribe({
      next: (response: any) => {
        if (response.success) {
          this.loadStaffTasks();
        }
      },
      error: (error: any) => {
        alert('Failed to delete task: ' + (error.error?.message || error.message));
      }
    });
  }

  toggleTaskCompletion(task: Task): void {
    const newStatus = task.status === 'COMPLETED' ? 'PENDING' : 'COMPLETED';
    this.isUpdatingTask.set(true);

    const taskId = task._id || task.id || '';
    this.taskService.updateTaskStatus(taskId, newStatus).subscribe({
      next: (response: any) => {
        if (response.success) {
          this.loadStaffTasks();
        }
        this.isUpdatingTask.set(false);
      },
      error: (error: any) => {
        alert('Failed to update task: ' + (error.error?.message || error.message));
        this.isUpdatingTask.set(false);
      }
    });
  }

  closeSelection(): void {
    this.selectedStaff.set(null);
    this.staffTasks.set([]);
    this.taskForm.reset({ priority: 'MEDIUM' });
  }
}
