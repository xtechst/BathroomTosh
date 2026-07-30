import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LeaveService } from '../../../services/leave.service';
import { LeaveRequest } from '../../../models/leave';

@Component({
  selector: 'app-leave-approvals',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="leave-page">
      <h1>Leave Approvals</h1>
      <p class="intro">Review and action pending leave requests from your team and escalated approvals.</p>

      <div *ngIf="error()" class="message error">{{ error() }}</div>
      <div *ngIf="successMessage()" class="message success">{{ successMessage() }}</div>

      <div *ngIf="loading()" class="loading">Loading pending leave requests...</div>

      <div *ngIf="!loading() && pendingRequests().length === 0" class="no-data">
        No pending leave requests at the moment.
      </div>

      <div *ngIf="pendingRequests().length > 0" class="request-grid">
        <div *ngFor="let request of pendingRequests()" class="request-card" [ngClass]="'status-' + (request.status || '').toLowerCase()">
          <div class="request-header">
            <div>
              <h3>{{ getRequesterName(request) }}</h3>
              <p class="meta">Type: {{ request.leaveType }} • Status: {{ request.status }}</p>
            </div>
            <span class="status-badge">{{ request.status }}</span>
          </div>

          <div class="request-body">
            <p><strong>From:</strong> {{ request.startDate | date:'mediumDate' }}</p>
            <p><strong>To:</strong> {{ request.endDate | date:'mediumDate' }}</p>
            <p><strong>Reason:</strong> {{ request.reason }}</p>
            <p *ngIf="request.autoEscalated" class="flag">Auto-escalated acting supervisor request</p>
            <p *ngIf="request.escalatedTo">Escalated To: {{ getEscalationTarget(request) }}</p>
          </div>

          <div class="action-area">
            <label>Notes</label>
            <textarea
              [(ngModel)]="notes[request._id || request.id || '']"
              placeholder="Optional approval/rejection notes"
              rows="3"
            ></textarea>

            <div class="buttons">
              <button type="button" (click)="approveLeave(request._id || request.id || '')" [disabled]="actionLoading()">Approve</button>
              <button type="button" class="reject" (click)="rejectLeave(request._id || request.id || '')" [disabled]="actionLoading()">Reject</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .leave-page {
      max-width: 1000px;
      margin: 0 auto;
      padding: 2rem;
      background: white;
      border-radius: 12px;
      box-shadow: 0 2px 12px rgba(0,0,0,0.08);
    }
    .intro {
      margin-bottom: 1.25rem;
      color: #4f5d73;
    }
    .request-grid {
      display: grid;
      gap: 1.4rem;
    }
    .request-card {
      border: 1px solid #e3e8ef;
      border-radius: 12px;
      padding: 1.4rem;
      background: #fbfdff;
    }
    .request-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 1rem;
    }
    .meta {
      margin: 0.35rem 0 0;
      color: #657381;
    }
    .status-badge {
      padding: 0.45rem 0.8rem;
      border-radius: 999px;
      text-transform: uppercase;
      font-size: 0.78rem;
      font-weight: 700;
    }
    .status-approved .status-badge { background: #dff3e7; color: #1c7b3a; }
    .status-pending .status-badge { background: #fff5d8; color: #9a7416; }
    .status-rejected .status-badge { background: #ffd8d8; color: #a72828; }
    .request-body p { margin: 0.5rem 0; }
    .flag { color: #8f5d00; font-weight: 600; }
    .action-area { margin-top: 1rem; }
    label { display: block; margin-bottom: 0.5rem; font-weight: 600; }
    textarea {
      width: 100%;
      padding: 0.85rem;
      border-radius: 10px;
      border: 1px solid #d7dde7;
      font-size: 0.95rem;
      resize: vertical;
    }
    .buttons {
      display: flex;
      gap: 0.75rem;
      margin-top: 1rem;
    }
    button {
      border: none;
      border-radius: 10px;
      padding: 0.85rem 1.3rem;
      font-weight: 700;
      cursor: pointer;
      background: #2972ff;
      color: white;
    }
    button.reject { background: #d9383b; }
    button:disabled { opacity: 0.6; cursor: not-allowed; }
    .message { padding: 1rem; border-radius: 10px; margin-bottom: 1rem; }
    .message.error { background: #ffe3e3; color: #7f1717; }
    .message.success { background: #e6f9ed; color: #1d6f2d; }
    .no-data, .loading { color: #5f6d7a; font-size: 1rem; }
  `]
})
export class LeaveApprovalsComponent implements OnInit {
  private readonly leaveService = inject(LeaveService);
  pendingRequests = signal<LeaveRequest[]>([]);
  loading = signal(false);
  actionLoading = signal(false);
  error = signal<string | null>(null);
  successMessage = signal<string | null>(null);
  notes: Record<string, string> = {};

  ngOnInit() {
    this.loadPendingRequests();
  }

  loadPendingRequests() {
    this.loading.set(true);
    this.error.set(null);

    this.leaveService.getPendingLeaveRequests().subscribe({
      next: (response) => {
        if (response.success) {
          this.pendingRequests.set(response.leaveRequests);
        } else {
          this.error.set('Unable to load pending leave requests');
        }
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set('Failed to load pending leave requests');
        this.loading.set(false);
        console.error('Error loading pending leave requests:', err);
      }
    });
  }

  approveLeave(requestId: string) {
    if (!requestId) {
      return;
    }
    this.actionLoading.set(true);
    this.error.set(null);
    this.successMessage.set(null);

    const notes = this.notes[requestId] || undefined;
    this.leaveService.approveLeaveRequest(requestId, notes).subscribe({
      next: (response) => {
        if (response.success) {
          this.successMessage.set('Leave request approved successfully');
          this.loadPendingRequests();
        } else {
          this.error.set(response.message || 'Failed to approve leave request');
        }
        this.actionLoading.set(false);
      },
      error: (err) => {
        this.error.set('Failed to approve leave request');
        this.actionLoading.set(false);
        console.error('Error approving leave request:', err);
      }
    });
  }

  rejectLeave(requestId: string) {
    if (!requestId) {
      return;
    }
    this.actionLoading.set(true);
    this.error.set(null);
    this.successMessage.set(null);

    const notes = this.notes[requestId] || undefined;
    this.leaveService.rejectLeaveRequest(requestId, notes).subscribe({
      next: (response) => {
        if (response.success) {
          this.successMessage.set('Leave request rejected');
          this.loadPendingRequests();
        } else {
          this.error.set(response.message || 'Failed to reject leave request');
        }
        this.actionLoading.set(false);
      },
      error: (err) => {
        this.error.set('Failed to reject leave request');
        this.actionLoading.set(false);
        console.error('Error rejecting leave request:', err);
      }
    });
  }

  getRequesterName(request: LeaveRequest): string {
    const user = request.userId;
    if (!user) {
      return 'Unknown User';
    }
    if (typeof user === 'string') {
      return user;
    }
    return `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.username || 'Unknown User';
  }

  getEscalationTarget(request: LeaveRequest): string {
    const escalatedTo = request.escalatedTo;
    if (!escalatedTo) {
      return 'Not assigned';
    }
    if (typeof escalatedTo === 'string') {
      return escalatedTo;
    }
    const person: any = escalatedTo as any;
    return `${person.firstName || ''} ${person.lastName || ''}`.trim() || person.username || 'Unknown';
  }
}
