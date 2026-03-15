import { Component, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../../services/auth.service';

@Component({
  selector: 'app-audit-logs',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="audit-page">
      <h1>Audit Logs</h1>
      <p>Complete action history and traceability.</p>
      
      <div class="audit-panel">
        <h3>System Audit Trail</h3>
        <p><strong>Features:</strong></p>
        <ul>
          <li>Complete timestamp of all actions</li>
          <li>Tracks user who performed action</li>
          <li>Records "on behalf of" for acting roles</li>
          <li>Logs all role delegations and expirations</li>
          <li>Tracks leave request auto-escalations</li>
          <li>Immutable audit trail for compliance</li>
        </ul>

        <h4>Audit Log Entry Structure:</h4>
        <pre>{{ auditExample }}</pre>

        @if (auditLogsLoading()) {
          <p class="loading">Loading audit logs...</p>
        }

        @if (!auditLogsLoading() && auditLogs().length > 0) {
          <h4 style="margin-top: 2rem;">Recent Audit Logs</h4>
          <div class="audit-table">
            @for (log of auditLogs(); track log.id) {
              <div class="audit-entry">
                <span class="timestamp">{{ log.timestamp | date:'short' }}</span>
                <span class="action">{{ log.action }}</span>
              </div>
            }
          </div>
        }
      </div>
    </div>
  `,
  styles: [`
    .audit-page {
      background: white;
      padding: 2rem;
      border-radius: 12px;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
    }

    h1 { color: #333; margin-bottom: 1rem; }
    h3 { color: #333; margin: 2rem 0 1rem 0; }
    h4 { color: #555; margin: 1.5rem 0 0.75rem 0; }
    p { color: #666; }
    ul { color: #666; }
    li { margin-bottom: 0.5rem; }

    .audit-panel {
      background-color: #f5f5f5;
      padding: 1.5rem;
      border-radius: 8px;
      border-left: 4px solid #667eea;
    }

    pre {
      background-color: #272822;
      color: #f8f8f2;
      padding: 1rem;
      border-radius: 6px;
      overflow-x: auto;
      font-size: 0.85rem;
      line-height: 1.5;
      margin: 0;
    }

    .loading {
      color: #667eea;
      font-style: italic;
    }

    .audit-table {
      margin-top: 1rem;
      background: white;
      border-radius: 6px;
    }

    .audit-entry {
      display: grid;
      grid-template-columns: 200px 1fr;
      gap: 1rem;
      padding: 0.75rem;
      border-bottom: 1px solid #eee;
    }

    .audit-entry:last-child {
      border-bottom: none;
    }

    .timestamp {
      color: #666;
      font-size: 0.9rem;
    }

    .action {
      color: #333;
      font-weight: 500;
    }
  `]
})
export class AuditLogsComponent {
  auditExample = `{
  "id": "audit_1234567890",
  "timestamp": "2026-03-14T17:45:30Z",
  "actionPerformerId": "u2",
  "onBehalfOfId": null,
  "action": "TASK_COMPLETED"
}`;

  auditLogsLoading = signal(true);
  auditLogs = signal<any[]>([]);

  constructor(private authService: AuthService) {
    this.loadAuditLogs();
  }

  private loadAuditLogs(): void {
    this.auditLogsLoading.set(true);
    this.authService.getAuditLogs().subscribe({
      next: (logs) => {
        this.auditLogs.set(logs);
        this.auditLogsLoading.set(false);
      },
      error: (err) => {
        console.error('Failed to load audit logs:', err);
        this.auditLogsLoading.set(false);
      }
    });
  }
}
