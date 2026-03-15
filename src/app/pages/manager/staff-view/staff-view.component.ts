import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { UserService } from '../../../services/user.service';
import { User } from '../../../models';

@Component({
  selector: 'app-manager-staff',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  template: `
    <div class="manager-staff-container">
      <h1>Staff Management</h1>

      <!-- Staff List Section -->
      <div class="section">
        <h2>All Staff Members</h2>
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
                <th>Role</th>
                <th>Current Supervisor</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let member of staff()">
                <td>{{ member.username }}</td>
                <td>{{ member.firstName || '' }} {{ member.lastName || '' }}</td>
                <td>{{ member.email }}</td>
                <td>{{ member.baseRole }}</td>
                <td>{{ getSupervisorDisplay(member.supervisorId) }}</td>
                <td>
                  <button (click)="selectStaffForAssignment(member)">
                    Assign Supervisor
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Assign Supervisor Section -->
      <div class="section" *ngIf="selectedStaff()">
        <h2>Assign Supervisor: {{ selectedStaff()?.username }}</h2>
        <form [formGroup]="assignForm" (ngSubmit)="onAssignSupervisor()">
          <div class="form-group">
            <label>Select Supervisor *</label>
            <select formControlName="supervisorId">
              <option value="">Choose a Supervisor</option>
              <option *ngFor="let supervisor of supervisors()" [value]="supervisor._id || supervisor.id || ''">
                {{ supervisor.firstName || '' }} {{ supervisor.lastName || '' }} ({{ supervisor.username }})
              </option>
            </select>
            <span class="error" *ngIf="assignForm.get('supervisorId')?.invalid && assignForm.get('supervisorId')?.touched">
              Please select a supervisor
            </span>
          </div>

          <button type="submit" [disabled]="assignForm.invalid || isAssigning()">
            {{ isAssigning() ? 'Assigning...' : 'Assign Supervisor' }}
          </button>
          <button type="button" (click)="cancelAssignment()">Cancel</button>

          <span class="success" *ngIf="assignSuccess()">{{ assignSuccess() }}</span>
          <span class="error" *ngIf="assignError()">{{ assignError() }}</span>
        </form>
      </div>
    </div>
  `,
  styles: [`
    .manager-staff-container {
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

    select {
      padding: 8px;
      border: 1px solid #ccc;
      border-radius: 4px;
      font-size: 14px;
    }

    select:focus {
      outline: none;
      border-color: #2196F3;
      box-shadow: 0 0 5px rgba(33, 150, 243, 0.3);
    }

    button {
      padding: 10px 15px;
      background-color: #2196F3;
      color: white;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      margin-right: 10px;
      margin-top: 10px;
      font-size: 14px;
    }

    button:hover:not(:disabled) {
      background-color: #1976D2;
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

    .staff-table {
      margin-top: 15px;
      overflow-x: auto;
    }

    table {
      width: 100%;
      border-collapse: collapse;
      background: white;
    }

    th {
      background-color: #2196F3;
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
      background-color: #4CAF50;
    }

    table button:hover {
      background-color: #45a049;
    }
  `]
})
export class ManagerStaffComponent implements OnInit {
  assignForm!: FormGroup;

  staff = signal<User[]>([]);
  supervisors = signal<User[]>([]);
  selectedStaff = signal<User | null>(null);

  isLoading = signal(false);
  isAssigning = signal(false);

  assignSuccess = signal('');
  assignError = signal('');
  loadError = signal('');

  constructor(
    private userService: UserService,
    private fb: FormBuilder
  ) {
    this.assignForm = this.fb.group({
      supervisorId: ['', Validators.required]
    });
  }

  isSupervisorIdString(supervisorId: any): boolean {
    return typeof supervisorId === 'string';
  }

  getSupervisorDisplay(supervisorId: any): string {
    if (!supervisorId) return 'Unassigned';
    if (typeof supervisorId === 'string') return 'Assigned (ID Only)';
    if (supervisorId && supervisorId.username) return supervisorId.username;
    return 'Unassigned';
  }

  ngOnInit(): void {
    this.loadStaff();
    this.loadSupervisors();
  }

  loadStaff(): void {
    this.isLoading.set(true);
    this.loadError.set('');
    this.userService.getAllUsers().subscribe({
      next: (response: any) => {
        if (response.success) {
          // Filter to show only STAFF members
          this.staff.set(response.users.filter((u: User) => u.baseRole === 'STAFF'));
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
    this.userService.getAllUsers().subscribe({
      next: (response: any) => {
        if (response.success) {
          // Filter to show only SUPERVISORS
          this.supervisors.set(response.users.filter((u: User) => u.baseRole === 'SUPERVISOR'));
        }
      },
      error: (error: any) => {
        console.error('Failed to load supervisors:', error);
      }
    });
  }

  selectStaffForAssignment(staffMember: User): void {
    this.selectedStaff.set(staffMember);
    this.assignForm.reset();
    this.assignSuccess.set('');
    this.assignError.set('');
  }

  cancelAssignment(): void {
    this.selectedStaff.set(null);
    this.assignForm.reset();
  }

  onAssignSupervisor(): void {
    if (this.assignForm.invalid || !this.selectedStaff()) return;

    this.isAssigning.set(true);
    this.assignSuccess.set('');
    this.assignError.set('');

    const supervisorId = this.assignForm.get('supervisorId')?.value;
    const staffId = this.selectedStaff()?._id || this.selectedStaff()?.id || '';

    this.userService.assignSupervisor(staffId, supervisorId).subscribe({
      next: (response: any) => {
        if (response.success) {
          this.assignSuccess.set('Supervisor assigned successfully!');
          setTimeout(() => {
            this.cancelAssignment();
            this.loadStaff();
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
