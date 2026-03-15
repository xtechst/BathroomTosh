import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../../services/auth.service';
import { TaskService } from '../../../services/task.service';
import { Task } from '../../../models';

@Component({
  selector: 'app-tasks',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="tasks-container">
      <h1>My Assigned Tasks</h1>
      
      @if (currentUser()) {
        <div class="user-info">
          <p>Assigned to: <strong>{{ currentUser()!.username }}</strong></p>
        </div>
      }

      <div class="controls">
        <button (click)="loadTasks()" [disabled]="isLoading()">
          {{ isLoading() ? 'Loading...' : 'Refresh Tasks' }}
        </button>
      </div>

      @if (error()) {
        <div class="error-message">
          {{ error() }}
        </div>
      }

      @if (tasks().length > 0) {
        <div class="tasks-grid">
          @for (task of tasks(); track task._id || task.id) {
            <div class="task-card" [ngClass]="'status-' + (task.status || '').toLowerCase()">
              <div class="task-header">
                <h3>{{ task.title }}</h3>
                <span class="priority-badge" [ngClass]="'priority-' + (task.priority || 'LOW').toUpperCase()">
                  {{ task.priority || 'NO PRIORITY' }}
                </span>
              </div>

              @if (task.description) {
                <p class="description">{{ task.description }}</p>
              }

              <div class="task-details">
                <div class="detail">
                  <span class="label">Area:</span>
                  <span class="value">{{ task.area || 'N/A' }}</span>
                </div>

                <div class="detail">
                  <span class="label">Status:</span>
                  <span class="status-badge" [ngClass]="'status-' + (task.status || 'PENDING').toLowerCase()">
                    {{ task.status || 'PENDING' }}
                  </span>
                </div>

                @if (task.dueDate) {
                  <div class="detail">
                    <span class="label">Due Date:</span>
                    <span class="value">{{ formatDate(task.dueDate) }}</span>
                  </div>
                }

                @if (task.completedAt) {
                  <div class="detail">
                    <span class="label">Date Completed:</span>
                    <span class="value">{{ formatDate(task.completedAt) }}</span>
                  </div>
                }
              </div>

              @if (task.checklist && task.checklist.length > 0) {
                <div class="checklist">
                  <h4>Checklist:</h4>
                  <ul>
                    @for (item of task.checklist; track $index) {
                      <li [ngClass]="item.isCompleted ? 'completed' : ''">
                        <span class="check">{{ item.isCompleted ? '✓' : '○' }}</span>
                        {{ item.title }}
                      </li>
                    }
                  </ul>
                </div>
              }
            </div>
          }
        </div>
      } @else {
        <div class="no-tasks">
          <p>No tasks assigned to you yet.</p>
        </div>
      }
    </div>
  `,
  styles: [`
    .tasks-container {
      padding: 2rem;
      max-width: 1400px;
      margin: 0 auto;
    }

    h1 {
      color: #333;
      margin-bottom: 1.5rem;
      font-size: 2rem;
    }

    .user-info {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 1.5rem;
      border-radius: 8px;
      margin-bottom: 2rem;
    }

    .user-info p {
      margin: 0;
      font-size: 1.1rem;
    }

    .controls {
      margin-bottom: 2rem;
    }

    button {
      padding: 10px 20px;
      background: #667eea;
      color: white;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-size: 14px;
      transition: background 0.3s ease;
    }

    button:hover:not(:disabled) {
      background: #5568d3;
    }

    button:disabled {
      background: #ccc;
      cursor: not-allowed;
    }

    .error-message {
      background: #ffebee;
      color: #c62828;
      padding: 1rem;
      border-radius: 4px;
      margin-bottom: 1.5rem;
    }

    .no-tasks {
      text-align: center;
      padding: 3rem;
      color: #666;
      background: #f5f5f5;
      border-radius: 8px;
    }

    .tasks-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
      gap: 1.5rem;
    }

    .task-card {
      background: white;
      border-radius: 8px;
      padding: 1.5rem;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
      border-left: 4px solid #667eea;
      transition: transform 0.3s ease, box-shadow 0.3s ease;
    }

    .task-card:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
    }

    .task-card.status-completed {
      background: #f1f8f4;
      border-left-color: #4caf50;
    }

    .task-card.status-in_progress {
      border-left-color: #2196f3;
    }

    .task-card.status-pending {
      border-left-color: #ff9800;
    }

    .task-card.status-cancelled {
      background: #f5f5f5;
      border-left-color: #9c27b0;
      opacity: 0.7;
    }

    .task-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 1rem;
      margin-bottom: 1rem;
    }

    .task-header h3 {
      margin: 0;
      color: #333;
      flex: 1;
    }

    .priority-badge {
      padding: 4px 12px;
      border-radius: 20px;
      font-size: 0.75rem;
      font-weight: 600;
      white-space: nowrap;
      text-transform: uppercase;
    }

    .priority-HIGH {
      background: #c62828;
      color: white;
    }

    .priority-MEDIUM {
      background: #e65100;
      color: white;
    }

    .priority-LOW {
      background: #2e7d32;
      color: white;
    }

    .description {
      color: #666;
      font-size: 0.95rem;
      margin: 0.5rem 0 1rem 0;
      line-height: 1.4;
    }

    .task-details {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 1rem;
      margin: 1rem 0;
      padding-top: 1rem;
      border-top: 1px solid #eee;
    }

    .detail {
      display: flex;
      flex-direction: column;
    }

    .label {
      font-size: 0.8rem;
      font-weight: 600;
      color: #999;
      text-transform: uppercase;
      margin-bottom: 0.25rem;
    }

    .value {
      color: #333;
      font-size: 0.95rem;
    }

    .status-badge {
      display: inline-block;
      padding: 4px 8px;
      border-radius: 4px;
      font-size: 0.75rem;
      font-weight: 600;
      text-transform: uppercase;
      width: fit-content;
    }

    .status-pending {
      background: #fff3e0;
      color: #e65100;
    }

    .status-in_progress {
      background: #e3f2fd;
      color: #1976d2;
    }

    .status-completed {
      background: #e8f5e9;
      color: #388e3c;
    }

    .status-cancelled {
      background: #f3e5f5;
      color: #6a1b9a;
    }

    .checklist {
      margin-top: 1rem;
      padding-top: 1rem;
      border-top: 1px solid #eee;
    }

    .checklist h4 {
      margin: 0 0 0.7rem 0;
      font-size: 0.9rem;
      color: #666;
      text-transform: uppercase;
    }

    .checklist ul {
      list-style: none;
      padding: 0;
      margin: 0;
    }

    .checklist li {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.4rem 0;
      color: #666;
      font-size: 0.9rem;
    }

    .checklist li.completed {
      color: #999;
      text-decoration: line-through;
    }

    .check {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 18px;
      height: 18px;
      color: #667eea;
      font-weight: bold;
      font-size: 0.9rem;
    }

    @media (max-width: 768px) {
      .tasks-container {
        padding: 1rem;
      }

      .tasks-grid {
        grid-template-columns: 1fr;
      }

      .task-header {
        flex-direction: column;
      }

      .task-details {
        grid-template-columns: 1fr;
      }
    }
  `]
})
export class TasksComponent implements OnInit {
  tasks = signal<Task[]>([]);
  currentUser = signal<any>(null);
  isLoading = signal(false);
  error = signal('');

  constructor(
    private taskService: TaskService,
    private authService: AuthService
  ) {
    this.currentUser.set(this.authService.getCurrentUser());
  }

  ngOnInit(): void {
    this.loadTasks();
  }

  loadTasks(): void {
    const user = this.authService.getCurrentUser();
    if (!user) {
      this.error.set('User not logged in');
      return;
    }

    this.isLoading.set(true);
    this.error.set('');

    const userId = user._id || user.id || '';
    this.taskService.getTasksForUser(userId).subscribe({
      next: (response: any) => {
        if (response.success && response.tasks) {
          this.tasks.set(response.tasks);
        } else if (Array.isArray(response)) {
          this.tasks.set(response);
        } else {
          this.tasks.set([]);
        }
        this.isLoading.set(false);
      },
      error: (error: any) => {
        this.error.set('Failed to load tasks: ' + (error.error?.message || error.message));
        this.isLoading.set(false);
      }
    });
  }

  formatDate(date: Date | string | undefined): string {
    if (!date) return 'N/A';
    
    const d = typeof date === 'string' ? new Date(date) : date;
    if (isNaN(d.getTime())) return 'Invalid Date';
    
    const options: Intl.DateTimeFormatOptions = {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    };
    return d.toLocaleDateString('en-US', options);
  }
}
