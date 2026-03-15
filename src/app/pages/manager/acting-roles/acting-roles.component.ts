import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-acting-roles',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="acting-page">
      <h1>Manage Acting Roles</h1>
      <p>Manager acting role delegation interface.</p>
      <p><strong>Critical Features:</strong></p>
      <ul>
        <li>Delegate roles with time-bound window</li>
        <li>Force session refresh at Acting_End + 1 second</li>
        <li>Auto-escalation: Acting Supervisor leave → Manager approval</li>
        <li>Original user enters Audit Mode (Read-Only) while delegate active</li>
        <li>Complete audit trail of all delegations</li>
        <li>Temporal overlay: Acting is NOT permanent account change</li>
      </ul>
    </div>
  `,
  styles: [`
    .acting-page {
      background: white;
      padding: 2rem;
      border-radius: 12px;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
    }
    h1 { color: #333; margin-bottom: 1rem; }
    p { color: #666; }
    ul { color: #666; }
    li { margin-bottom: 0.5rem; }
  `]
})
export class ActingRolesComponent {}
