import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-unauthorized',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="unauthorized-page">
      <div class="error-card">
        <div class="error-icon">🔒</div>
        <h1>Access Denied</h1>
        <p>You do not have permission to access this resource.</p>
        
        <div class="info">
          <p><strong>Your Role:</strong> You may not have the required permissions for this action.</p>
          <p><strong>What to do:</strong></p>
          <ul>
            <li>Check your assigned role and permissions</li>
            <li>Contact your administrator if you believe this is an error</li>
            <li>Return to the dashboard to access available features</li>
          </ul>
        </div>

        <a routerLink="/dashboard" class="back-btn">Return to Dashboard</a>
      </div>
    </div>
  `,
  styles: [`
    .unauthorized-page {
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: calc(100vh - 100px);
      padding: 2rem;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    }

    .error-card {
      background: white;
      border-radius: 12px;
      padding: 3rem 2rem;
      max-width: 500px;
      text-align: center;
      box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
    }

    .error-icon {
      font-size: 4rem;
      margin-bottom: 1rem;
    }

    h1 {
      color: #333;
      margin: 0 0 0.5rem 0;
      font-size: 2rem;
    }

    > p {
      color: #666;
      font-size: 1.1rem;
      margin: 0 0 2rem 0;
    }

    .info {
      text-align: left;
      background-color: #f5f5f5;
      padding: 1.5rem;
      border-radius: 8px;
      margin-bottom: 2rem;
      color: #666;
    }

    .info p {
      margin: 0.75rem 0;
    }

    .info strong {
      color: #333;
    }

    .info ul {
      margin: 1rem 0 0 0;
      padding-left: 1.5rem;
    }

    .info li {
      margin-bottom: 0.5rem;
    }

    .back-btn {
      display: inline-block;
      padding: 1rem 2rem;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      text-decoration: none;
      border-radius: 6px;
      font-weight: 600;
      transition: transform 0.3s ease, box-shadow 0.3s ease;
    }

    .back-btn:hover {
      transform: translateY(-3px);
      box-shadow: 0 6px 20px rgba(102, 126, 234, 0.4);
    }
  `]
})
export class UnauthorizedComponent {}
