import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { AuthService } from '../../../services/auth.service';
import { LeaveService } from '../../../services/leave.service';
import { LeaveRequest, LeaveType } from '../../../models/leave';
import { User, BaseRole } from '../../../models';

@Component({
  selector: 'app-staff-leave',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  template: `
    <div class="leave-container">
      <h1>Apply for Leave</h1>

      <div *ngIf="currentUser()" class="user-info">
        <p>Applying as: <strong>{{ currentUser()!.firstName }} {{ currentUser()!.lastName }}</strong></p>
        <p class="approval-path">
          Approval path: 
          <strong *ngIf="effectiveRole() === 'STAFF'">Supervisor</strong>
          <strong *ngIf="effectiveRole() === 'SUPERVISOR'">Manager</strong>
          <strong *ngIf="effectiveRole() === 'MANAGER'">Tech Admin</strong>
          <strong *ngIf="effectiveRole() === 'TECH_ADMIN'">Auto-approved</strong>
          <span *ngIf="effectiveRole() === 'SUPERVISOR' && currentUser()!.baseRole === 'SUPERVISOR'"> (requests from acting supervisors are auto-escalated)</span>
        </p>
        <div *ngIf="currentUser()!.leaveBalances" class="leave-balances">
          <p>Leave Balances:</p>
          <ul>
            <li>Annual Leave: {{ currentUser()!.leaveBalances!.annual }} days</li>
            <li>Sick Leave: {{ currentUser()!.leaveBalances!.sick }} days</li>
            <li>Other Sick Leave: {{ currentUser()!.leaveBalances!.otherSick }} days</li>
          </ul>
        </div>
      </div>

      <!-- Leave Application Form -->
      <div class="section">
        <h2>Submit Leave Request</h2>
        <form [formGroup]="leaveForm" (ngSubmit)="onSubmitLeave()">
          <div class="form-group">
            <label>Leave Type *</label>
            <select formControlName="leaveType">
              <option value="">Select Leave Type</option>
              <option value="ANNUAL">Annual Leave</option>
              <option value="SICK">Sick Leave</option>
              <option value="OTHER_SICK">Other Sick Leave</option>
            </select>
            <span class="error" *ngIf="leaveForm.get('leaveType')?.invalid && leaveForm.get('leaveType')?.touched">
              Leave type is required
            </span>
          </div>

          <div class="form-group">
            <label>Start Date *</label>
            <input type="date" formControlName="startDate" [min]="minDate" />
            <span class="error" *ngIf="leaveForm.get('startDate')?.invalid && leaveForm.get('startDate')?.touched">
              Start date is required
            </span>
          </div>

          <div class="form-group">
            <label>End Date *</label>
            <input type="date" formControlName="endDate" [min]="minDate" />
            <span class="error" *ngIf="leaveForm.get('endDate')?.invalid && leaveForm.get('endDate')?.touched">
              End date is required and must be after start date
            </span>
          </div>

          <div class="form-group">
            <label>Reason *</label>
            <textarea formControlName="reason" placeholder="Please provide a reason for your leave request" rows="4"></textarea>
            <span class="error" *ngIf="leaveForm.get('reason')?.invalid && leaveForm.get('reason')?.touched">
              Reason is required
            </span>
          </div>

          <button type="submit" [disabled]="leaveForm.invalid || isSubmitting()">
            {{ isSubmitting() ? 'Submitting...' : 'Submit Leave Request' }}
          </button>
        </form>
      </div>

      <!-- Previous Leave Requests -->
      <div class="section">
        <h2>My Leave Requests</h2>
        <div *ngIf="leaveRequests().length > 0; else noLeaveRequests" class="leave-requests-list">
            <div *ngFor="let request of leaveRequests()" class="leave-request-card" [ngClass]="'status-' + (request.status || '').toLowerCase()">
                <div class="request-header">
                  <h3>{{ request.leaveType }} Leave</h3>
                  <span class="status-badge">{{ request.status }}</span>
                </div>
                <div class="request-details">
                  <p><strong>From:</strong> {{ request.startDate | date:'mediumDate' }}</p>
                  <p><strong>To:</strong> {{ request.endDate | date:'mediumDate' }}</p>
                  <p><strong>Reason:</strong> {{ request.reason }}</p>
                  <p *ngIf="request.approvalNotes"><strong>Notes:</strong> {{ request.approvalNotes }}</p>
                </div>
              </div>
        </div>
        <ng-template #noLeaveRequests>
          <p>No leave requests found.</p>
        </ng-template>
      </div>

      <div *ngIf="error()" class="error-message">
          {{ error() }}
      </div>

      <div *ngIf="successMessage()" class="success-message">
          {{ successMessage() }}
      </div>
    </div>
  `,
  styles: [`
    .leave-container {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      min-height: 70vh;
      padding: 2rem;
      box-sizing: border-box;
    }

    .user-info {
      background: #f8f9fa;
      padding: 1rem;
      border-radius: 8px;
      margin-bottom: 2rem;
    }

    .leave-balances ul {
      list-style: none;
      padding: 0;
      margin: 0.5rem 0 0 0;
    }

    .leave-balances li {
      margin: 0.25rem 0;
    }

    .section {
      background: white;
      padding: 1.5rem;
      border-radius: 8px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
      margin-bottom: 2rem;
      width: 100%;
      max-width: 720px;
    }

    .form-group {
      margin-bottom: 1rem;
    }

    label {
      display: block;
      margin-bottom: 0.5rem;
      font-weight: 500;
    }

    input, select, textarea {
      width: 100%;
      padding: 0.5rem;
      border: 1px solid #ddd;
      border-radius: 4px;
      font-size: 1rem;
    }

    textarea {
      resize: vertical;
    }

    .error {
      color: #dc3545;
      font-size: 0.875rem;
      margin-top: 0.25rem;
    }

    button {
      background: #007bff;
      color: white;
      padding: 0.75rem 1.5rem;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-size: 1rem;
    }

    button:disabled {
      background: #6c757d;
      cursor: not-allowed;
    }

    .leave-requests-list {
      display: grid;
      gap: 1rem;
    }

    .leave-request-card {
      border: 1px solid #ddd;
      border-radius: 8px;
      padding: 1rem;
    }

    .status-approved {
      border-color: #28a745;
      background: #f8fff9;
    }

    .status-pending {
      border-color: #ffc107;
      background: #fffef8;
    }

    .status-rejected {
      border-color: #dc3545;
      background: #fff8f8;
    }

    .request-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 1rem;
    }

    .status-badge {
      padding: 0.25rem 0.5rem;
      border-radius: 4px;
      font-size: 0.875rem;
      font-weight: 500;
    }

    .status-approved .status-badge {
      background: #28a745;
      color: white;
    }

    .status-pending .status-badge {
      background: #ffc107;
      color: black;
    }

    .status-rejected .status-badge {
      background: #dc3545;
      color: white;
    }

    .error-message {
      background: #f8d7da;
      color: #721c24;
      padding: 1rem;
      border-radius: 4px;
      margin-bottom: 1rem;
    }

    .success-message {
      background: #d4edda;
      color: #155724;
      padding: 1rem;
      border-radius: 4px;
      margin-bottom: 1rem;
    }
  `]
})
export class StaffLeaveComponent implements OnInit {
  currentUser = signal<User | null>(null);
  effectiveRole = signal<BaseRole | null>(null);
  leaveRequests = signal<LeaveRequest[]>([]);
  leaveForm: FormGroup;
  isSubmitting = signal(false);
  error = signal<string | null>(null);
  successMessage = signal<string | null>(null);
  minDate: string;

  constructor(
    private authService: AuthService,
    private leaveService: LeaveService,
    private fb: FormBuilder
  ) {
    // Set minimum date to tomorrow
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    this.minDate = tomorrow.toISOString().split('T')[0];

    this.leaveForm = this.fb.group({
      leaveType: ['', Validators.required],
      startDate: ['', Validators.required],
      endDate: ['', Validators.required],
      reason: ['', Validators.required]
    }, { validators: this.dateRangeValidator });
  }

  ngOnInit() {
    this.loadCurrentUser();
    this.loadLeaveRequests();
  }

  private loadCurrentUser() {
    this.currentUser.set(this.authService.getCurrentUser());
    this.effectiveRole.set(this.authService.getEffectiveRole());
  }

  private loadLeaveRequests() {
    const user = this.authService.getCurrentUser();
    if (user && user._id) {
      this.leaveService.getUserLeaveRequests(user._id).subscribe({
        next: (response) => {
          if (response.success) {
            this.leaveRequests.set(response.leaveRequests);
          }
        },
        error: (err) => {
          this.error.set('Failed to load leave requests');
          console.error('Error loading leave requests:', err);
        }
      });
    }
  }

  dateRangeValidator(group: FormGroup) {
    const startDate = group.get('startDate')?.value;
    const endDate = group.get('endDate')?.value;

    if (startDate && endDate && new Date(startDate) > new Date(endDate)) {
      group.get('endDate')?.setErrors({ dateRange: true });
      return { dateRange: true };
    }

    return null;
  }

  onSubmitLeave() {
    if (this.leaveForm.invalid) {
      this.markFormGroupTouched();
      return;
    }

    this.isSubmitting.set(true);
    this.error.set(null);
    this.successMessage.set(null);

    const formValue = this.leaveForm.value;
    const request = {
      leaveType: formValue.leaveType as LeaveType,
      startDate: new Date(formValue.startDate),
      endDate: new Date(formValue.endDate),
      reason: formValue.reason
    };

    this.leaveService.submitLeaveRequest(request).subscribe({
      next: (response) => {
        if (response.success) {
          this.successMessage.set('Leave request submitted successfully');
          this.leaveForm.reset();
          this.loadLeaveRequests(); // Refresh the list
        } else {
          this.error.set(response.message || 'Failed to submit leave request');
        }
        this.isSubmitting.set(false);
      },
      error: (err) => {
        this.error.set('Failed to submit leave request');
        this.isSubmitting.set(false);
        console.error('Error submitting leave request:', err);
      }
    });
  }

  private markFormGroupTouched() {
    Object.keys(this.leaveForm.controls).forEach(key => {
      const control = this.leaveForm.get(key);
      control?.markAsTouched();
    });
  }
}