import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-leave-approvals',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="leave-page">
      <h1>Leave Approvals</h1>
      <p>Manager leave request approval interface.</p>
      <p><strong>Features:</strong></p>
      <ul>
        <li>Review leave requests from staff</li>
        <li>Auto-escalated requests from Acting Supervisors</li>
        <li>Approve/Reject leave with audit trail</li>
        <li>Prevent task assignment on approved leave dates</li>
      </ul>
    </div>
  `,
  styles: [`
    .leave-page {
      background: white;
      padding: 2rem;
      border-radius: 12px;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
    }
    h1 { color: #333; margin-bottom: 1rem; }
    p { color: #666; }
    ul { color: #666; }
  `]
})
export class LeaveApprovalsComponent {}
