import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { AuthService } from '../../../services/auth.service';
import { UserService } from '../../../services/user.service';
import { LeaveService } from '../../../services/leave.service';
import { User } from '../../../models';
import { LeaveRequest } from '../../../models/leave';

interface RosterEntry {
  date: string;
  staffId: string;
  isOffDay: boolean;
}

@Component({
  selector: 'app-roster',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  template: `
    <div class="roster-container">
      <h1>Manage Roster</h1>

      <div *ngIf="currentUser()" class="supervisor-info">
        <p>Supervisor: <strong>{{ currentUser()!.firstName }} {{ currentUser()!.lastName }}</strong></p>
      </div>

      <!-- Month Selection -->
      <div class="section">
        <h2>Select Month</h2>
        <div class="month-selector">
          <button type="button" (click)="previousMonth()" [disabled]="isLoading()">‹ Previous</button>
          <span class="current-month">{{ currentMonth() | date:'MMMM yyyy' }}</span>
          <button type="button" (click)="nextMonth()" [disabled]="isLoading()">Next ›</button>
        </div>
      </div>

      <!-- Roster Management -->
      <div class="section">
        <h2>Roster for {{ currentMonth() | date:'MMMM yyyy' }}</h2>

        <div *ngIf="assignedStaff().length > 0; else noAssignedStaff">
          <div class="roster-grid">
            <!-- Header with staff names -->
            <div class="roster-header">
              <div class="date-column">Date</div>
              <div *ngFor="let staff of assignedStaff()" class="staff-column">
                {{ staff.firstName }} {{ staff.lastName }}
              </div>
            </div>

            <!-- Calendar rows -->
            <div *ngFor="let day of daysInMonth" class="roster-row" [ngClass]="{'weekend': isWeekend(day), 'past-day': isPastDay(day)}">
              <div class="date-column">
                <div class="date">{{ day | date:'d' }}</div>
                <div class="day-name">{{ day | date:'EEE' }}</div>
              </div>

              <div *ngFor="let staff of assignedStaff()" class="staff-column">
                <div class="staff-cell">
                  <select
                    [value]="getRosterEntry(day, staff._id || staff.id || '')"
                    (change)="updateRosterEntry(day, staff._id || staff.id || '', $event)"
                    [disabled]="isPastDay(day) || isLoading()">
                    <option value="WORKING">Working</option>
                    <option value="OFF">Off</option>
                    <option value="LEAVE">On Leave</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          <div class="actions">
            <button type="button" (click)="saveRoster()" [disabled]="isLoading() || !hasChanges()">
              {{ isLoading() ? 'Saving...' : 'Save Roster' }}
            </button>
            <button type="button" (click)="resetRoster()" [disabled]="isLoading() || !hasChanges()">
              Reset Changes
            </button>
          </div>
        </div>
        <ng-template #noAssignedStaff>
          <p>No staff assigned to you.</p>
        </ng-template>
      </div>

      <!-- Leave Requests Overview -->
      <div class="section">
        <h2>Pending Leave Requests</h2>
        <div *ngIf="pendingLeaveRequests().length > 0; else noLeaveRequests" class="leave-requests-list">
          <div *ngFor="let request of pendingLeaveRequests()" class="leave-request-card">
            <div class="request-info">
              <h4>{{ getRequestUserName(request) }}</h4>
              <p><strong>Type:</strong> {{ request.leaveType }}</p>
              <p><strong>Dates:</strong> {{ request.startDate | date:'shortDate' }} - {{ request.endDate | date:'shortDate' }}</p>
              <p><strong>Reason:</strong> {{ request.reason }}</p>
            </div>
            <div class="request-actions">
              <button type="button" (click)="approveLeave(request._id || request.id || '')" [disabled]="isLoading()">
                Approve
              </button>
              <button type="button" (click)="rejectLeave(request._id || request.id || '')" [disabled]="isLoading()">
                Reject
              </button>
            </div>
          </div>
        </div>
        <ng-template #noLeaveRequests>
          <p>No pending leave requests.</p>
        </ng-template>
      </div>

      <!-- Supervisor Leave Application Section -->
      <div class="section">
        <h2>My Leave Requests</h2>
        <div class="leave-application-container">
          <div class="leave-form-card">
            <h3>Apply for Leave</h3>
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
                  Please select a leave type
                </span>
              </div>

              <div class="form-row">
                <div class="form-group">
                  <label>Start Date *</label>
                  <input type="date" formControlName="startDate" [min]="minDate" />
                  <span class="error" *ngIf="leaveForm.get('startDate')?.invalid && leaveForm.get('startDate')?.touched">
                    Please select a start date
                  </span>
                </div>

                <div class="form-group">
                  <label>End Date *</label>
                  <input type="date" formControlName="endDate" [min]="minDate" />
                  <span class="error" *ngIf="leaveForm.get('endDate')?.invalid && leaveForm.get('endDate')?.touched">
                    Please select an end date
                  </span>
                  <span class="error" *ngIf="leaveForm.hasError('invalidRange')">
                    End date must be after start date
                  </span>
                </div>
              </div>

              <div class="form-group">
                <label>Reason *</label>
                <textarea formControlName="reason" rows="3" placeholder="Please provide a reason for your leave request"></textarea>
                <span class="error" *ngIf="leaveForm.get('reason')?.invalid && leaveForm.get('reason')?.touched">
                  Please provide a reason
                </span>
              </div>

              <button type="submit" [disabled]="leaveForm.invalid || isSubmittingLeave()">
                {{ isSubmittingLeave() ? 'Submitting...' : 'Submit Leave Request' }}
              </button>

              <span class="success" *ngIf="leaveSuccess()">{{ leaveSuccess() }}</span>
              <span class="error" *ngIf="leaveError()">{{ leaveError() }}</span>
            </form>
          </div>

          <div class="leave-history-card">
            <h3>Your Leave History</h3>
            <div *ngIf="supervisorLeaveRequests().length > 0; else noLeaveHistory" class="leave-list">
              <div *ngFor="let request of supervisorLeaveRequests()" class="leave-item" [ngClass]="'status-' + (request.status || '').toLowerCase()">
                <div class="leave-item-header">
                  <strong>{{ request.leaveType }}</strong>
                  <span class="status-badge">{{ request.status || 'UNKNOWN' }}</span>
                </div>
                <p><strong>Dates:</strong> {{ request.startDate | date:'shortDate' }} - {{ request.endDate | date:'shortDate' }}</p>
                <p><strong>Reason:</strong> {{ request.reason }}</p>
                <p *ngIf="request.approvalNotes"><strong>Approval Notes:</strong> {{ request.approvalNotes }}</p>
              </div>
            </div>
            <ng-template #noLeaveHistory>
              <p class="no-data">No leave requests submitted yet.</p>
            </ng-template>
          </div>
        </div>
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
    .roster-container {
      max-width: 1200px;
      margin: 0 auto;
      padding: 2rem;
    }

    .supervisor-info {
      background: #f8f9fa;
      padding: 1rem;
      border-radius: 8px;
      margin-bottom: 2rem;
    }

    .section {
      background: white;
      padding: 1.5rem;
      border-radius: 8px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
      margin-bottom: 2rem;
    }

    .month-selector {
      display: flex;
      align-items: center;
      gap: 1rem;
      justify-content: center;
    }

    .month-selector button {
      padding: 0.5rem 1rem;
      border: 1px solid #ddd;
      background: white;
      border-radius: 4px;
      cursor: pointer;
    }

    .month-selector button:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .current-month {
      font-size: 1.25rem;
      font-weight: 500;
      min-width: 150px;
      text-align: center;
    }

    .roster-grid {
      border: 1px solid #ddd;
      border-radius: 8px;
      overflow: hidden;
    }

    .roster-header {
      display: flex;
      background: #f8f9fa;
      font-weight: 500;
    }

    .roster-row {
      display: flex;
      border-bottom: 1px solid #eee;
    }

    .roster-row.weekend {
      background: #fffef8;
    }

    .roster-row.past-day {
      background: #f8f8f8;
      opacity: 0.7;
    }

    .date-column {
      width: 80px;
      padding: 1rem;
      text-align: center;
      border-right: 1px solid #eee;
      background: #f8f9fa;
    }

    .date {
      font-size: 1.25rem;
      font-weight: 500;
    }

    .day-name {
      font-size: 0.875rem;
      color: #666;
      margin-top: 0.25rem;
    }

    .staff-column {
      flex: 1;
      padding: 0.5rem;
      border-right: 1px solid #eee;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .staff-cell {
      width: 100%;
    }

    select {
      width: 100%;
      padding: 0.5rem;
      border: 1px solid #ddd;
      border-radius: 4px;
      background: white;
    }

    .roster-row.past-day select {
      background: #f8f8f8;
    }

    .actions {
      display: flex;
      gap: 1rem;
      justify-content: center;
      margin-top: 2rem;
    }

    button {
      padding: 0.75rem 1.5rem;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-size: 1rem;
    }

    button:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .actions button:first-child {
      background: #28a745;
      color: white;
    }

    .actions button:last-child {
      background: #6c757d;
      color: white;
    }

    .leave-requests-list {
      display: grid;
      gap: 1rem;
    }

    .leave-request-card {
      border: 1px solid #ddd;
      border-radius: 8px;
      padding: 1rem;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .request-info h4 {
      margin: 0 0 0.5rem 0;
    }

    .request-info p {
      margin: 0.25rem 0;
    }

    .request-actions {
      display: flex;
      gap: 0.5rem;
    }

    .request-actions button:first-child {
      background: #28a745;
      color: white;
    }

    .request-actions button:last-child {
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

    .leave-application-container {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 2rem;
      margin-top: 1.5rem;
    }

    @media (max-width: 900px) {
      .leave-application-container {
        grid-template-columns: 1fr;
      }
    }

    .leave-form-card, .leave-history-card {
      border: 1px solid #ddd;
      border-radius: 8px;
      padding: 1.5rem;
      background: #fff;
    }

    .leave-form-card h3, .leave-history-card h3 {
      margin-top: 0;
      color: #007bff;
    }

    .form-row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 1rem;
    }

    .form-group {
      margin-bottom: 1rem;
    }

    .form-group label {
      display: block;
      margin-bottom: 0.5rem;
      font-weight: 500;
    }

    .form-group input,
    .form-group select,
    .form-group textarea {
      width: 100%;
      padding: 0.5rem;
      border: 1px solid #ddd;
      border-radius: 4px;
      font-family: inherit;
      font-size: 0.95rem;
    }

    .form-group textarea {
      resize: vertical;
    }

    .form-group .error {
      color: #dc3545;
      font-size: 0.85rem;
      margin-top: 0.25rem;
      display: block;
    }

    .leave-form-card button {
      width: 100%;
      padding: 0.75rem;
      background: #007bff;
      color: white;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-size: 1rem;
      font-weight: 500;
      margin-top: 1rem;
    }

    .leave-form-card button:hover:not(:disabled) {
      background: #0056b3;
    }

    .leave-form-card button:disabled {
      background: #6c757d;
      cursor: not-allowed;
    }

    .form-group .success {
      color: #155724;
      background: #d4edda;
      padding: 0.5rem;
      border-radius: 4px;
      margin-top: 1rem;
      display: block;
    }

    .leave-list {
      display: grid;
      gap: 1rem;
      max-height: 500px;
      overflow-y: auto;
    }

    .leave-item {
      border-left: 4px solid #ddd;
      padding: 1rem;
      background: #f9f9f9;
      border-radius: 4px;
    }

    .leave-item.status-pending {
      border-left-color: #ffc107;
    }

    .leave-item.status-approved {
      border-left-color: #28a745;
    }

    .leave-item.status-rejected {
      border-left-color: #dc3545;
    }

    .leave-item-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 0.5rem;
    }

    .status-badge {
      padding: 0.25rem 0.75rem;
      border-radius: 20px;
      font-size: 0.8rem;
      font-weight: 600;
    }

    .leave-item.status-pending .status-badge {
      background: #fff3cd;
      color: #856404;
    }

    .leave-item.status-approved .status-badge {
      background: #d4edda;
      color: #155724;
    }

    .leave-item.status-rejected .status-badge {
      background: #f8d7da;
      color: #721c24;
    }

    .leave-item p {
      margin: 0.5rem 0;
      font-size: 0.95rem;
    }

    .no-data {
      text-align: center;
      color: #666;
      padding: 2rem 1rem;
      font-style: italic;
    }
  `]
})
export class RosterComponent implements OnInit {
  currentUser = signal<User | null>(null);
  assignedStaff = signal<User[]>([]);
  pendingLeaveRequests = signal<LeaveRequest[]>([]);
  supervisorLeaveRequests = signal<LeaveRequest[]>([]);
  currentMonth = signal<Date>(new Date());
  rosterData = signal<RosterEntry[]>([]);
  originalRosterData = signal<RosterEntry[]>([]);
  isLoading = signal(false);
  isSubmittingLeave = signal(false);
  error = signal<string | null>(null);
  successMessage = signal<string | null>(null);
  leaveError = signal<string | null>(null);
  leaveSuccess = signal<string | null>(null);
  
  leaveForm: FormGroup;
  minDate: string;

  constructor(
    private authService: AuthService,
    private userService: UserService,
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
    this.loadAssignedStaff();
    this.loadPendingLeaveRequests();
    this.loadSupervisorLeaveRequests();
    this.loadRosterData();
  }

  private loadCurrentUser() {
    this.currentUser.set(this.authService.getCurrentUser());
  }

  private loadAssignedStaff() {
    const user = this.authService.getCurrentUser();
    if (user && user._id) {
      this.userService.getUsersBySupervisor(user._id).subscribe({
        next: (response) => {
          if (response.success) {
            this.assignedStaff.set(response.users);
          }
        },
        error: (err) => {
          this.error.set('Failed to load assigned staff');
          console.error('Error loading assigned staff:', err);
        }
      });
    }
  }

  private loadPendingLeaveRequests() {
    const user = this.authService.getCurrentUser();
    if (user && user._id) {
      this.leaveService.getSupervisorLeaveRequests(user._id).subscribe({
        next: (response) => {
          if (response.success) {
            this.pendingLeaveRequests.set(response.leaveRequests);
          }
        },
        error: (err) => {
          this.error.set('Failed to load leave requests');
          console.error('Error loading leave requests:', err);
        }
      });
    }
  }

  private loadSupervisorLeaveRequests() {
    const user = this.authService.getCurrentUser();
    if (user && user._id) {
      this.leaveService.getUserLeaveRequests(user._id).subscribe({
        next: (response) => {
          if (response.success) {
            this.supervisorLeaveRequests.set(response.leaveRequests);
          }
        },
        error: (err) => {
          console.error('Error loading supervisor leave requests:', err);
        }
      });
    }
  }

  private loadRosterData() {
    // For now, initialize with default "WORKING" for all days
    // In a real implementation, this would load from a backend service
    const roster: RosterEntry[] = [];
    const days = this.daysInMonth;
    const staff = this.assignedStaff();

    for (const day of days) {
      for (const staffMember of staff) {
        roster.push({
          date: day.toISOString().split('T')[0],
          staffId: staffMember._id || staffMember.id || '',
          isOffDay: false
        });
      }
    }

    this.rosterData.set(roster);
    this.originalRosterData.set([...roster]);
  }

  get daysInMonth(): Date[] {
    const month = this.currentMonth();
    const year = month.getFullYear();
    const monthIndex = month.getMonth();

    const firstDay = new Date(year, monthIndex, 1);
    const lastDay = new Date(year, monthIndex + 1, 0);
    const days: Date[] = [];

    for (let date = new Date(firstDay); date <= lastDay; date.setDate(date.getDate() + 1)) {
      days.push(new Date(date));
    }

    return days;
  }

  isWeekend(date: Date): boolean {
    const day = date.getDay();
    return day === 0 || day === 6; // Sunday = 0, Saturday = 6
  }

  isPastDay(date: Date): boolean {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return date < today;
  }

  previousMonth() {
    const current = this.currentMonth();
    this.currentMonth.set(new Date(current.getFullYear(), current.getMonth() - 1, 1));
    this.loadRosterData();
  }

  nextMonth() {
    const current = this.currentMonth();
    this.currentMonth.set(new Date(current.getFullYear(), current.getMonth() + 1, 1));
    this.loadRosterData();
  }

  getRosterEntry(date: Date, staffId: string): string {
    const dateStr = date.toISOString().split('T')[0];
    const entry = this.rosterData().find(r => r.date === dateStr && r.staffId === staffId);
    if (entry?.isOffDay) return 'OFF';

    const leaveRequest = this.pendingLeaveRequests().find(req => {
      const requestUserId = typeof req.userId === 'string'
        ? req.userId
        : req.userId._id || req.userId.id || '';
      return (
        requestUserId === staffId &&
        new Date(req.startDate) <= date &&
        new Date(req.endDate) >= date &&
        req.status === 'APPROVED'
      );
    });

    return leaveRequest ? 'LEAVE' : 'WORKING';
  }

  getRequestUserName(request: LeaveRequest): string {
    if (typeof request.userId === 'string') {
      return request.userId;
    }

    const firstName = request.userId.firstName || '';
    const lastName = request.userId.lastName || '';
    return `${firstName} ${lastName}`.trim() || request.userId.username || 'Unknown User';
  }

  updateRosterEntry(date: Date, staffId: string, event: Event) {
    const target = event.target as HTMLSelectElement;
    const value = target.value;
    const dateStr = date.toISOString().split('T')[0];

    const updatedRoster = this.rosterData().map(entry => {
      if (entry.date === dateStr && entry.staffId === staffId) {
        return { ...entry, isOffDay: value === 'OFF' };
      }
      return entry;
    });

    this.rosterData.set(updatedRoster);
  }

  hasChanges(): boolean {
    return JSON.stringify(this.rosterData()) !== JSON.stringify(this.originalRosterData());
  }

  saveRoster() {
    // In a real implementation, this would save to backend
    this.originalRosterData.set([...this.rosterData()]);
    this.successMessage.set('Roster saved successfully');
    setTimeout(() => this.successMessage.set(null), 3000);
  }

  resetRoster() {
    this.rosterData.set([...this.originalRosterData()]);
  }

  approveLeave(requestId: string) {
    this.leaveService.approveLeaveRequest(requestId).subscribe({
      next: (response) => {
        if (response.success) {
          this.successMessage.set('Leave request approved');
          this.loadPendingLeaveRequests();
        } else {
          this.error.set(response.message || 'Failed to approve leave request');
        }
      },
      error: (err) => {
        this.error.set('Failed to approve leave request');
        console.error('Error approving leave request:', err);
      }
    });
  }

  rejectLeave(requestId: string) {
    // For now, just remove from pending list
    // In a real implementation, you'd call a reject endpoint
    this.pendingLeaveRequests.set(
      this.pendingLeaveRequests().filter(req => (req._id || req.id) !== requestId)
    );
    this.successMessage.set('Leave request rejected');
    setTimeout(() => this.successMessage.set(null), 3000);
  }

  dateRangeValidator(group: FormGroup) {
    const startDate = group.get('startDate')?.value;
    const endDate = group.get('endDate')?.value;

    if (startDate && endDate) {
      if (new Date(endDate) < new Date(startDate)) {
        group.get('endDate')?.setErrors({ invalidRange: true });
        return { invalidRange: true };
      }
    }
    return null;
  }

  onSubmitLeave() {
    if (this.leaveForm.invalid) {
      this.leaveError.set('Please fill in all required fields correctly');
      return;
    }

    this.isSubmittingLeave.set(true);
    this.leaveError.set(null);
    this.leaveSuccess.set(null);

    const formValue = this.leaveForm.value;
    const request = {
      leaveType: formValue.leaveType,
      startDate: new Date(formValue.startDate),
      endDate: new Date(formValue.endDate),
      reason: formValue.reason
    };

    this.leaveService.submitLeaveRequest(request).subscribe({
      next: (response) => {
        if (response.success) {
          this.leaveSuccess.set('Leave request submitted successfully!');
          this.leaveForm.reset();
          this.loadSupervisorLeaveRequests();
          setTimeout(() => this.leaveSuccess.set(null), 3000);
        } else {
          this.leaveError.set(response.message || 'Failed to submit leave request');
        }
        this.isSubmittingLeave.set(false);
      },
      error: (err) => {
        this.leaveError.set('Failed to submit leave request: ' + (err.error?.message || err.message));
        this.isSubmittingLeave.set(false);
      }
    });
  }
}
