import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-roster',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="roster-page">
      <h1>Manage Roster</h1>
      <p>Supervisor roster management interface.</p>
      <p><strong>Features:</strong></p>
      <ul>
        <li>View staff roster</li>
        <li>Check staff leave status</li>
        <li>Monitor staff task assignments</li>
        <li>In Audit Mode: Read-only access when delegate is active</li>
      </ul>
    </div>
  `,
  styles: [`
    .roster-page {
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
export class RosterComponent {}
