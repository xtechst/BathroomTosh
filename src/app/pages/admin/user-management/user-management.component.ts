import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { UserService, CreateUserRequest, UpdateUserRequest } from '../../../services/user.service';
import { User } from '../../../models';

@Component({
  selector: 'app-user-management',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './user-management.component.html',
  styleUrl: './user-management.component.css'
})
export class UserManagementComponent implements OnInit {
  createForm!: FormGroup;
  editForm!: FormGroup;
  supervisorForm!: FormGroup;
  managerForm!: FormGroup;

  users = signal<User[]>([]);
  supervisorList = signal<User[]>([]);
  managerList = signal<User[]>([]);
  selectedUser = signal<User | null>(null);

  isCreating = signal(false);
  isLoadingUsers = signal(false);
  isUpdating = signal(false);
  isAssigningSupervisor = signal(false);
  isAssigningManager = signal(false);

  createSuccess = signal('');
  createError = signal('');
  updateSuccess = signal('');
  updateError = signal('');
  assignSupervisorSuccess = signal('');
  assignSupervisorError = signal('');
  assignManagerSuccess = signal('');
  assignManagerError = signal('');
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

    this.supervisorForm = this.fb.group({
      supervisorId: ['', Validators.required]
    });
    this.managerForm = this.fb.group({
      managerId: ['', Validators.required]
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

    // Load supervisors separately via role endpoint to avoid client-side filtering
    this.userService.getUsersByRole('SUPERVISOR').subscribe({
      next: (res: any) => {
        if (res.success) {
          this.supervisorList.set(res.users || res.supervisors || []);
        }
      },
      error: (err: any) => {
        // fallback: filter loaded users if role endpoint fails
        const fromUsers = this.users().filter((u: User) => u.baseRole === 'SUPERVISOR' || u.baseRole === 'TECH_ADMIN');
        this.supervisorList.set(fromUsers);
        console.error('Failed to load supervisors by role, using fallback filter:', err);
      }
    });

    // Load managers for assignment dropdown
    this.userService.getUsersByRole('MANAGER').subscribe({
      next: (res: any) => {
        if (res.success) {
          this.managerList.set(res.users || []);
        }
      },
      error: (err: any) => {
        const fromUsers = this.users().filter((u: User) => u.baseRole === 'MANAGER' || u.baseRole === 'TECH_ADMIN');
        this.managerList.set(fromUsers);
        console.error('Failed to load managers by role, using fallback filter:', err);
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
    this.supervisorForm.reset({ supervisorId: '' });
    this.managerForm.reset({ managerId: '' });
    this.updateSuccess.set('');
    this.updateError.set('');
    this.assignSupervisorSuccess.set('');
    this.assignSupervisorError.set('');
  }

  cancelEdit(): void {
    this.selectedUser.set(null);
    this.editForm.reset();
    this.supervisorForm.reset();
    this.managerForm.reset();
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

  onAssignSupervisor(): void {
    if (!this.selectedUser() || this.supervisorForm.invalid) return;

    this.isAssigningSupervisor.set(true);
    this.assignSupervisorSuccess.set('');
    this.assignSupervisorError.set('');

    const supervisorId = this.supervisorForm.get('supervisorId')?.value;
    const staffId = this.selectedUser()?._id || this.selectedUser()?.id || '';

    this.userService.assignSupervisor(staffId, supervisorId).subscribe({
      next: (response: any) => {
        if (response.success) {
          this.assignSupervisorSuccess.set('Supervisor assigned successfully!');
          this.loadUsers();
          setTimeout(() => {
            this.cancelEdit();
          }, 1500);
        }
        this.isAssigningSupervisor.set(false);
      },
      error: (error: any) => {
        this.assignSupervisorError.set('Failed to assign supervisor: ' + (error.error?.message || error.message));
        this.isAssigningSupervisor.set(false);
      }
    });
  }

  onAssignManager(): void {
    if (!this.selectedUser() || this.managerForm.invalid) return;

    this.isAssigningManager.set(true);
    this.assignManagerSuccess.set('');
    this.assignManagerError.set('');

    const managerId = this.managerForm.get('managerId')?.value;
    const supervisorId = this.selectedUser()?._id || this.selectedUser()?.id || '';

    this.userService.assignManager(supervisorId, managerId).subscribe({
      next: (response: any) => {
        if (response.success) {
          this.assignManagerSuccess.set('Manager assigned successfully!');
          this.loadUsers();
          setTimeout(() => {
            this.cancelEdit();
          }, 1500);
        }
        this.isAssigningManager.set(false);
      },
      error: (error: any) => {
        this.assignManagerError.set('Failed to assign manager: ' + (error.error?.message || error.message));
        this.isAssigningManager.set(false);
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
