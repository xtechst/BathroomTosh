import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { UserService, CreateUserRequest, UpdateUserRequest } from '../../../services/user.service';
import { User } from '../../../models';

@Component({
  selector: 'app-user-management',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  template: `
    <div class="user-management-container">
      <h1>User Management</h1>

      <!-- Create User Section -->
      <div class="section">
        <h2>Create New User</h2>
        <form [formGroup]="createForm" (ngSubmit)="onCreateUser()">
          <div class="form-group">
            <label>Username *</label>
            <input type="text" formControlName="username" placeholder="Enter username" />
            <span class="error" *ngIf="createForm.get('username')?.invalid && createForm.get('username')?.touched">
              Username is required
            </span>
          </div>

          <div class="form-group">
            <label>Password *</label>
            <input type="password" formControlName="password" placeholder="Enter password" />
            <span class="error" *ngIf="createForm.get('password')?.invalid && createForm.get('password')?.touched">
              Password is required
            </span>
          </div>

          <div class="form-group">
            <label>First Name</label>
            <input type="text" formControlName="firstName" placeholder="Enter first name" />
          </div>

          <div class="form-group">
            <label>Last Name</label>
            <input type="text" formControlName="lastName" placeholder="Enter last name" />
          </div>

          <div class="form-group">
            <label>Email</label>
            <input type="email" formControlName="email" placeholder="Enter email" />
          </div>

          <div class="form-group">
            <label>Role *</label>
            <select formControlName="baseRole">
              <option value="">Select Role</option>
              <option value="TECH_ADMIN">Admin</option>
              <option value="MANAGER">Manager</option>
              <option value="SUPERVISOR">Supervisor</option>
              <option value="STAFF">Staff</option>
            </select>
          </div>

          <button type="submit" [disabled]="createForm.invalid || isCreating()">
            {{ isCreating() ? 'Creating...' : 'Create User' }}
          </button>

          <span class="success" *ngIf="createSuccess()">{{ createSuccess() }}</span>
          <span class="error" *ngIf="createError()">{{ createError() }}</span>
        </form>
      </div>

      <!-- User List Section -->
      <div class="section">
        <h2>Users List</h2>
        <button (click)="loadUsers()" [disabled]="isLoadingUsers()">
          {{ isLoadingUsers() ? 'Loading...' : 'Load Users' }}
        </button>

        <span class="error" *ngIf="loadError()">{{ loadError() }}</span>

        <div *ngIf="users().length > 0" class="users-table">
          <table>
            <thead>
              <tr>
                <th>Username</th>
                <th>Name</th>
                <th>Email</th>
                <th>Role</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let user of users()">
                <td>{{ user.username }}</td>
                <td>{{ user.firstName || '' }} {{ user.lastName || '' }}</td>
                <td>{{ user.email }}</td>
                <td>{{ user.baseRole }}</td>
                <td>{{ user.isActive ? 'Active' : 'Inactive' }}</td>
                <td>
                  <button (click)="selectUserForEdit(user)">Edit</button>
                  <button (click)="deleteUser(user._id || user.id || '')">Delete</button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Edit User Section -->
      <div class="section" *ngIf="selectedUser()">
        <h2>Edit User: {{ selectedUser()?.username }}</h2>
        <form [formGroup]="editForm" (ngSubmit)="onUpdateUser()">
          <div class="form-group">
            <label>First Name</label>
            <input type="text" formControlName="firstName" />
          </div>

          <div class="form-group">
            <label>Last Name</label>
            <input type="text" formControlName="lastName" />
          </div>

          <div class="form-group">
            <label>Email</label>
            <input type="email" formControlName="email" />
          </div>

          <div class="form-group">
            <label>Role</label>
            <select formControlName="baseRole">
              <option value="TECH_ADMIN">Admin</option>
              <option value="MANAGER">Manager</option>
              <option value="SUPERVISOR">Supervisor</option>
              <option value="STAFF">Staff</option>
            </select>
          </div>

          <button type="submit" [disabled]="isUpdating()">
            {{ isUpdating() ? 'Updating...' : 'Update User' }}
          </button>
          <button type="button" (click)="cancelEdit()">Cancel</button>

          <span class="success" *ngIf="updateSuccess()">{{ updateSuccess() }}</span>
          <span class="error" *ngIf="updateError()">{{ updateError() }}</span>
        </form>
      </div>
    </div>
  `,
  styles: [`
    .user-management-container {
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

    input, select {
      padding: 8px;
      border: 1px solid #ccc;
      border-radius: 4px;
      font-size: 14px;
    }

    input:focus, select:focus {
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
      margin-right: 10px;
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

    .users-table {
      margin-top: 15px;
      overflow-x: auto;
    }

    table {
      width: 100%;
      border-collapse: collapse;
      background: white;
    }

    th {
      background-color: #4CAF50;
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
      margin-right: 5px;
    }
  `]
})
export class UserManagementComponent implements OnInit {
  createForm!: FormGroup;
  editForm!: FormGroup;

  users = signal<User[]>([]);
  selectedUser = signal<User | null>(null);

  isCreating = signal(false);
  isLoadingUsers = signal(false);
  isUpdating = signal(false);

  createSuccess = signal('');
  createError = signal('');
  updateSuccess = signal('');
  updateError = signal('');
  loadError = signal('');

  constructor(
    private userService: UserService,
    private fb: FormBuilder
  ) {
    this.createForm = this.fb.group({
      username: ['', Validators.required],
      password: ['', Validators.required],
      firstName: [''],
      lastName: [''],
      email: [''],
      baseRole: ['STAFF', Validators.required]
    });

    this.editForm = this.fb.group({
      firstName: [''],
      lastName: [''],
      email: [''],
      baseRole: ['']
    });
  }

  ngOnInit(): void {
    this.loadUsers();
  }

  loadUsers(): void {
    this.isLoadingUsers.set(true);
    this.loadError.set('');
    this.userService.getAllUsers().subscribe({
      next: (response: any) => {
        if (response.success) {
          this.users.set(response.users);
        }
        this.isLoadingUsers.set(false);
      },
      error: (error: any) => {
        this.loadError.set('Failed to load users: ' + (error.error?.message || error.message));
        this.isLoadingUsers.set(false);
      }
    });
  }

  onCreateUser(): void {
    if (this.createForm.invalid) return;

    this.isCreating.set(true);
    this.createSuccess.set('');
    this.createError.set('');

    const payload: CreateUserRequest = this.createForm.value;

    this.userService.createUser(payload).subscribe({
      next: (response: any) => {
        if (response.success) {
          this.createSuccess.set('User created successfully!');
          this.createForm.reset({ baseRole: 'STAFF' });
          this.loadUsers();
        }
        this.isCreating.set(false);
      },
      error: (error: any) => {
        this.createError.set('Failed to create user: ' + (error.error?.message || error.message));
        this.isCreating.set(false);
      }
    });
  }

  selectUserForEdit(user: User): void {
    this.selectedUser.set(user);
    this.editForm.patchValue({
      firstName: user.firstName || '',
      lastName: user.lastName || '',
      email: user.email || '',
      baseRole: user.baseRole
    });
    this.updateSuccess.set('');
    this.updateError.set('');
  }

  cancelEdit(): void {
    this.selectedUser.set(null);
    this.editForm.reset();
  }

  onUpdateUser(): void {
    if (!this.selectedUser()) return;

    this.isUpdating.set(true);
    this.updateSuccess.set('');
    this.updateError.set('');

    const payload: UpdateUserRequest = this.editForm.value;
    const userId = this.selectedUser()?._id || this.selectedUser()?.id || '';

    this.userService.updateUser(userId, payload).subscribe({
      next: (response: any) => {
        if (response.success) {
          this.updateSuccess.set('User updated successfully!');
          this.cancelEdit();
          this.loadUsers();
        }
        this.isUpdating.set(false);
      },
      error: (error: any) => {
        this.updateError.set('Failed to update user: ' + (error.error?.message || error.message));
        this.isUpdating.set(false);
      }
    });
  }

  deleteUser(userId: string): void {
    if (!confirm('Are you sure you want to delete this user?')) return;

    this.userService.deleteUser(userId).subscribe({
      next: (response) => {
        if (response.success) {
          this.loadUsers();
        }
      },
      error: (error) => {
        alert('Failed to delete user: ' + (error.error?.message || error.message));
      }
    });
  }
}
