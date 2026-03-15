import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-system-config',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="config-page">
      <h1>System Configuration</h1>
      <p>Tech Admin system configuration interface.</p>
      <p><strong>Admin Functions:</strong></p>
      <ul>
        <li>Manage user roles and permissions</li>
        <li>Configure system settings</li>
        <li>Full Read/Write access to all facility data</li>
        <li>Initiate and revoke acting roles</li>
        <li>Monitor system health</li>
      </ul>
    </div>
  `,
  styles: [`
    .config-page {
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
export class SystemConfigComponent {}
