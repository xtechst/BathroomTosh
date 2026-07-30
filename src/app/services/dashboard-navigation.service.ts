import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from './auth.service';
import { BaseRole } from '../models';

/**
 * Service to handle role-based dashboard navigation
 * Routes users to their primary role dashboard
 */
@Injectable({
  providedIn: 'root'
})
export class DashboardNavigationService {
  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  /**
   * Navigate to the appropriate dashboard based on user's role
   * Priority: TECH_ADMIN > MANAGER > SUPERVISOR > STAFF
   */
  navigateToDashboard(): void {
    const user = this.authService.getCurrentUser();
    if (!user) {
      this.router.navigate(['/login']);
      return;
    }

    // Always navigate to the main dashboard when dashboard button is clicked
    console.log(`Navigating to dashboard for role ${user.baseRole}`);
    this.router.navigate(['/dashboard']).catch(err => {
      console.error('Navigation failed:', err);
    });
  }

  /**
   * Get the primary dashboard route for a given role
   */
  getDashboardForRole(role: BaseRole): string {
    // All roles now stay on the shared dashboard for overview
    return '/dashboard';
  }

  /**
   * Get a user-friendly dashboard title based on role
   */
  getDashboardTitle(role: BaseRole): string {
    switch (role) {
      case 'TECH_ADMIN':
        return 'System Administration';
      case 'MANAGER':
        return 'Manager Dashboard';
      case 'SUPERVISOR':
        return 'Supervisor Dashboard';
      case 'STAFF':
        return 'My Tasks';
      default:
        return 'Dashboard';
    }
  }
}
