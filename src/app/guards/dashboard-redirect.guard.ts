import { Injectable } from '@angular/core';
import { CanActivate, ActivatedRouteSnapshot, RouterStateSnapshot, Router, UrlTree } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { DashboardNavigationService } from '../services/dashboard-navigation.service';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class DashboardRedirectGuard implements CanActivate {
  constructor(
    private authService: AuthService,
    private router: Router,
    private dashboardNavService: DashboardNavigationService
  ) {}

  canActivate(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): boolean | UrlTree | Observable<boolean | UrlTree> {
    const user = this.authService.getCurrentUser();
    
    if (!user) {
      return this.router.parseUrl('/login');
    }

    // Get the target dashboard for the user's role
    const targetDashboard = this.dashboardNavService.getDashboardForRole(user.baseRole);
    
    console.log(`Dashboard Guard: User ${user.baseRole}, Target: ${targetDashboard}`);
    
    // If the target dashboard is not the generic /dashboard route, redirect
    if (targetDashboard && targetDashboard !== '/dashboard') {
      console.log(`Redirecting from /dashboard to ${targetDashboard}`);
      return this.router.parseUrl(targetDashboard);
    }

    // Allow access to /dashboard if that's the appropriate route for this user
    return true;
  }
}
