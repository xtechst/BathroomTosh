import { Injectable } from '@angular/core';
import { Router, CanActivateFn, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth.service';
import { BaseRole, RolePermissions } from '../models';

/**
 * Role-Based Route Guards
 * Protect routes based on user's effective role (considering acting assignments)
 */

@Injectable({
  providedIn: 'root'
})
export class AuthGuard {
  constructor(private authService: AuthService, private router: Router) {}

  canActivate(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): boolean {
    const user = this.authService.getCurrentUser();
    
    if (!user) {
      this.router.navigate(['/login']);
      return false;
    }

    // Check required role
    const requiredRoles = route.data['roles'] as BaseRole[];
    if (requiredRoles && requiredRoles.length > 0) {
      const effectiveRole = this.authService.getEffectiveRole();
      if (!requiredRoles.includes(effectiveRole)) {
        this.router.navigate(['/unauthorized']);
        return false;
      }
    }

    return true;
  }
}

/**
 * Guard for Tech Admin only routes
 */
export const techAdminGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const user = authService.getCurrentUser();
  if (!user || authService.getEffectiveRole() !== BaseRole.TECH_ADMIN) {
    return false;
  }
  return true;
};

/**
 * Guard for Manager and above routes
 */
export const managerGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const effectiveRole = authService.getEffectiveRole();
  const allowedRoles = [BaseRole.TECH_ADMIN, BaseRole.MANAGER];
  
  return allowedRoles.includes(effectiveRole);
};

/**
 * Guard for Supervisor and above routes
 */
export const supervisorGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const effectiveRole = authService.getEffectiveRole();
  const allowedRoles = [BaseRole.TECH_ADMIN, BaseRole.MANAGER, BaseRole.SUPERVISOR];
  
  return allowedRoles.includes(effectiveRole);
};

/**
 * Guard for Staff and above routes (authenticated users)
 */
export const staffGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const user = authService.getCurrentUser();
  return !!user;
};

/**
 * Permission-based guard
 * Checks if user has specific permission
 */
export const permissionGuard = (permission: keyof RolePermissions): CanActivateFn => {
  return (route, state) => {
    const authService = inject(AuthService);
    return authService.hasPermission(permission);
  };
};

/**
 * Audit Mode Guard
 * Prevents original user from modifying when a delegate is active
 * If user's ID matches original user in active acting assignment, they are in Read-Only mode
 */
export const auditModeGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const user = authService.getCurrentUser();
  const acting = authService.getActiveActingAssignment();

  if (!user || !acting || acting.status !== 'ACTIVE') {
    return true; // No acting assignment, normal mode
  }

  // If current user is the original user being delegated, check if they're trying to modify
  if (user.id === acting.originalUserId) {
    // This route requires modification rights, but user is in audit mode
    if (route.data['requiresWrite'] === true) {
      return false;
    }
  }

  return true;
};
