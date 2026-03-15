import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-assignments',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="assignments-page">
      <h1>Assign Tasks</h1>
      <p>Supervisor task assignment interface.</p>
      <p><strong>Validation Rules:</strong></p>
      <ul>
        <li>Cannot assign tasks on staff approved leave dates</li>
        <li>Cannot assign if original user is in Audit Mode</li>
        <li>Tasks linked to Areas (Kitchen, Bathroom)</li>
        <li>Checklists with boolean items required for completion</li>
      </ul>
    </div>
  `,
  styles: [`
    .assignments-page {
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
export class AssignmentsComponent {}
