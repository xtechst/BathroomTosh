import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="login-wrapper">
      <div class="login-container">
        <div class="login-card">
          <div class="login-header">
            <h1 class="login-title">🚀 BathroomTosh</h1>
            <p class="login-subtitle">Role-Based Access Control System</p>
          </div>

          <form (ngSubmit)="login()" class="login-form">
            <div class="form-group">
              <label for="username">Username</label>
              <input
                id="username"
                type="text"
                [(ngModel)]="username"
                name="username"
                placeholder="Enter your username"
                required
                autofocus
              />
            </div>

            <div class="form-group">
              <label for="password">Password</label>
              <input
                id="password"
                type="password"
                [(ngModel)]="password"
                name="password"
                placeholder="Enter your password"
                required
              />
            </div>

            <button type="submit" [disabled]="isLoading()" class="login-btn">
              @if (isLoading()) {
                <span class="spinner"></span>
                <span>Logging in...</span>
              } @else {
                <span>Sign In</span>
              }
            </button>

            @if (errorMessage()) {
              <div class="error-alert">
                <span class="error-icon">⚠️</span>
                <span class="error-text">{{ errorMessage() }}</span>
              </div>
            }
          </form>

          <div class="divider">
            <span>Demo Credentials</span>
          </div>

          <div class="demo-credentials">
            <div class="credential-card admin">
              <div class="role-tag">Admin</div>
              <div class="credential-content">
                <label>Username:</label>
                <code>admin</code>
                <label>Password:</label>
                <code>admin123</code>
              </div>
            </div>

            <div class="credential-card manager">
              <div class="role-tag">Manager</div>
              <div class="credential-content">
                <label>Username:</label>
                <code>manager</code>
                <label>Password:</label>
                <code>manager123</code>
              </div>
            </div>
          </div>

          <div class="login-footer">
            <p>🔒 Secure login with role-based access control</p>
            <p>Test different user roles and permissions</p>
          </div>
        </div>

        <div class="login-info">
          <h2>Welcome!</h2>
          <p>This is a demonstration of a comprehensive Role-Based Access Control (RBAC) system.</p>
          <div class="features">
            <h3>Key Features:</h3>
            <ul>
              <li>✅ 4-tier role hierarchy</li>
              <li>✅ Time-bound acting role delegation</li>
              <li>✅ Automatic approval auto-escalation</li>
              <li>✅ Immutable audit logs</li>
              <li>✅ Task management with checklists</li>
              <li>✅ Leave request tracking</li>
              <li>✅ Complete permission control</li>
              <li>✅ Audit mode enforcement</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    /* Error Alert Inline Styles */
    .error-alert {
      background: #ffe6e6;
      border: 1px solid #ff4757;
      border-radius: 8px;
      padding: 12px 16px;
      margin-top: 16px;
      display: flex;
      align-items: center;
      gap: 12px;
      animation: slideDown 0.3s ease-out;
    }

    .error-icon {
      font-size: 1.25rem;
      flex-shrink: 0;
    }

    .error-text {
      color: #d63031;
      font-size: 0.95rem;
      font-weight: 500;
    }

    .login-wrapper {
      min-height: 100vh;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 1rem;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
    }

    .login-container {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 2rem;
      max-width: 1000px;
      width: 100%;
      align-items: center;
    }

    .login-card {
      background: white;
      border-radius: 16px;
      padding: 3rem;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
      animation: slideUp 0.6s ease-out;
    }

    .login-header {
      text-align: center;
      margin-bottom: 2rem;
    }

    .login-title {
      margin: 0 0 0.5rem 0;
      color: #333;
      font-size: 2.5rem;
      font-weight: 700;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
    }

    .login-subtitle {
      margin: 0;
      color: #666;
      font-size: 0.95rem;
      font-weight: 500;
    }

    .login-form {
      display: flex;
      flex-direction: column;
      gap: 1.5rem;
      margin-bottom: 2rem;
    }

    .form-group {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }

    label {
      color: #333;
      font-weight: 600;
      font-size: 0.95rem;
    }

    input {
      padding: 0.85rem;
      border: 2px solid #e0e0e0;
      border-radius: 8px;
      font-size: 1rem;
      transition: all 0.3s ease;
      font-family: inherit;
    }

    input:focus {
      outline: none;
      border-color: #667eea;
      box-shadow: 0 0 0 4px rgba(102, 126, 234, 0.1);
    }

    input::placeholder {
      color: #999;
    }

    .error-message {
      background-color: #fee;
      color: #c33;
      padding: 1rem;
      border-radius: 8px;
      font-size: 0.9rem;
      display: flex;
      align-items: center;
      gap: 0.5rem;
      border-left: 4px solid #c33;
      animation: shake 0.4s ease-in-out;
    }

    .error-icon {
      font-size: 1.2rem;
      flex-shrink: 0;
    }

    .login-btn {
      padding: 1rem;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      border: none;
      border-radius: 8px;
      font-size: 1rem;
      font-weight: 700;
      cursor: pointer;
      transition: all 0.3s ease;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.75rem;
    }

    .login-btn:hover:not(:disabled) {
      transform: translateY(-2px);
      box-shadow: 0 10px 30px rgba(102, 126, 234, 0.4);
    }

    .login-btn:active:not(:disabled) {
      transform: translateY(0);
    }

    .login-btn:disabled {
      opacity: 0.8;
      cursor: not-allowed;
    }

    .spinner {
      width: 16px;
      height: 16px;
      border: 2px solid rgba(255, 255, 255, 0.3);
      border-top-color: white;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }

    .divider {
      position: relative;
      margin: 2rem 0;
      color: #999;
      font-size: 0.85rem;
      font-weight: 600;
      text-align: center;
    }

    .divider::before {
      content: '';
      position: absolute;
      top: 50%;
      left: 0;
      right: 0;
      height: 1px;
      background: #e0e0e0;
      z-index: 0;
    }

    .divider span {
      background: white;
      padding: 0 0.75rem;
      position: relative;
      z-index: 1;
    }

    .demo-credentials {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 1rem;
      margin-bottom: 2rem;
    }

    .credential-card {
      padding: 1rem;
      border-radius: 8px;
      position: relative;
      overflow: hidden;
    }

    .credential-card.admin {
      background: linear-gradient(135deg, rgba(102, 126, 234, 0.1) 0%, rgba(118, 75, 162, 0.1) 100%);
      border: 2px solid rgba(102, 126, 234, 0.2);
    }

    .credential-card.manager {
      background: linear-gradient(135deg, rgba(74, 172, 254, 0.1) 0%, rgba(0, 242, 254, 0.1) 100%);
      border: 2px solid rgba(74, 172, 254, 0.2);
    }

    .role-tag {
      display: inline-block;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 0.25rem 0.75rem;
      border-radius: 20px;
      font-size: 0.75rem;
      font-weight: 700;
      margin-bottom: 0.75rem;
      text-transform: uppercase;
    }

    .credential-content {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
      font-size: 0.85rem;
    }

    .credential-content label {
      margin: 0;
      margin-top: 0.5rem;
      color: #666;
      font-weight: 600;
      font-size: 0.75rem;
      text-transform: uppercase;
    }

    .credential-content code {
      background: rgba(0, 0, 0, 0.05);
      padding: 0.35rem 0.5rem;
      border-radius: 4px;
      font-family: 'Courier New', monospace;
      color: #333;
      font-weight: 500;
    }

    .login-footer {
      text-align: center;
      padding: 1rem;
      border-top: 1px solid #e0e0e0;
      color: #999;
      font-size: 0.85rem;
    }

    .login-footer p {
      margin: 0.35rem 0;
    }

    .login-info {
      color: white;
      display: flex;
      flex-direction: column;
      gap: 1.5rem;
    }

    .login-info h2 {
      margin: 0;
      font-size: 2rem;
      font-weight: 700;
    }

    .login-info > p {
      margin: 0;
      font-size: 1.05rem;
      opacity: 0.95;
      line-height: 1.6;
    }

    .features {
      background: rgba(255, 255, 255, 0.1);
      backdrop-filter: blur(10px);
      padding: 1.5rem;
      border-radius: 12px;
      border: 1px solid rgba(255, 255, 255, 0.2);
    }

    .features h3 {
      margin: 0 0 1rem 0;
      font-size: 1.1rem;
      font-weight: 700;
    }

    .features ul {
      margin: 0;
      padding-left: 1.5rem;
      list-style: none;
    }

    .features li {
      margin-bottom: 0.75rem;
      font-size: 0.95rem;
      opacity: 0.95;
    }

    @keyframes slideUp {
      from {
        opacity: 0;
        transform: translateY(20px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    @keyframes slideDown {
      from {
        opacity: 0;
        transform: translateY(-30px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    @keyframes fadeIn {
      from {
        opacity: 0;
      }
      to {
        opacity: 1;
      }
    }

    @keyframes shake {
      0%, 100% { transform: translateX(0); }
      25% { transform: translateX(-5px); }
      75% { transform: translateX(5px); }
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    @media (max-width: 768px) {
      .login-container {
        grid-template-columns: 1fr;
      }

      .login-card {
        padding: 2rem;
      }

      .login-title {
        font-size: 2rem;
      }

      .login-info {
        order: -1;
        padding: 0 1rem;
      }

      .demo-credentials {
        grid-template-columns: 1fr;
      }
    }

    @media (max-width: 480px) {
      .login-wrapper {
        padding: 0;
      }

      .login-container {
        gap: 1.5rem;
      }

      .login-card {
        padding: 1.5rem;
        border-radius: 12px;
        margin: 1rem;
      }

      .login-title {
        font-size: 1.5rem;
      }

      .login-info {
        display: none;
      }

      .demo-credentials {
        gap: 0.75rem;
      }

      .credential-card {
        padding: 0.75rem;
      }
    }
  `]
})
export class LoginComponent {
  username = signal('');
  password = signal('');
  isLoading = signal(false);
  errorMessage = signal('');

  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  login(): void {
    this.isLoading.set(true);
    this.errorMessage.set('');

    this.authService
      .login(this.username(), this.password())
      .subscribe({
        next: (result) => {
          this.isLoading.set(false);
          if (result.success) {
            this.router.navigate(['/dashboard']);
          } else {
            this.errorMessage.set(result.message || 'Login failed. Please check your credentials.');
          }
        },
        error: (error) => {
          this.isLoading.set(false);
          const errorMsg = error?.error?.message || 'Login failed. Please try again.';
          this.errorMessage.set(errorMsg);
        }
      });
  }

  closeError(): void {
    this.errorMessage.set('');
  }
}
