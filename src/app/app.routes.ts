import { Routes } from '@angular/router';
import { 
  staffGuard, 
  supervisorGuard, 
  managerGuard, 
  techAdminGuard,
  auditModeGuard 
} from './guards';
import { BaseRole } from './models';

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () => import('./pages/login/login.component').then(m => m.LoginComponent)
  },
  {
    path: 'dashboard',
    canActivate: [staffGuard],
    loadComponent: () => import('./pages/dashboard/dashboard.component').then(m => m.DashboardComponent)
  },
  {
    path: 'staff/tasks',
    canActivate: [staffGuard],
    loadComponent: () => import('./pages/staff/tasks/tasks.component').then(m => m.TasksComponent)
  },
  {
    path: 'supervisor/roster',
    canActivate: [supervisorGuard],
    canDeactivate: [auditModeGuard],
    data: { requiresWrite: true },
    loadComponent: () => import('./pages/supervisor/roster/roster.component').then(m => m.RosterComponent)
  },
  {
    path: 'supervisor/assignments',
    canActivate: [supervisorGuard],
    canDeactivate: [auditModeGuard],
    data: { requiresWrite: true },
    loadComponent: () => import('./pages/supervisor/assignments/assignments.component').then(m => m.AssignmentsComponent)
  },
  {
    path: 'manager/leave-approvals',
    canActivate: [managerGuard],
    loadComponent: () => import('./pages/manager/leave-approvals/leave-approvals.component').then(m => m.LeaveApprovalsComponent)
  },
  {
    path: 'manager/acting-roles',
    canActivate: [managerGuard],
    loadComponent: () => import('./pages/manager/acting-roles/acting-roles.component').then(m => m.ActingRolesComponent)
  },
  {
    path: 'admin/system-config',
    canActivate: [techAdminGuard],
    loadComponent: () => import('./pages/admin/system-config/system-config.component').then(m => m.SystemConfigComponent)
  },
  {
    path: 'admin/audit-logs',
    canActivate: [techAdminGuard],
    loadComponent: () => import('./pages/admin/audit-logs/audit-logs.component').then(m => m.AuditLogsComponent)
  },
  {
    path: 'admin/user-management',
    canActivate: [techAdminGuard],
    loadComponent: () => import('./pages/admin/user-management/user-management.component').then(m => m.UserManagementComponent)
  },
  {
    path: 'manager/staff-view',
    canActivate: [managerGuard],
    loadComponent: () => import('./pages/manager/staff-view/staff-view.component').then(m => m.ManagerStaffComponent)
  },
  {
    path: 'supervisor/staff-view',
    canActivate: [supervisorGuard],
    canDeactivate: [auditModeGuard],
    data: { requiresWrite: true },
    loadComponent: () => import('./pages/supervisor/staff-view/staff-view.component').then(m => m.SupervisorStaffComponent)
  },
  {
    path: 'unauthorized',
    loadComponent: () => import('./pages/unauthorized/unauthorized.component').then(m => m.UnauthorizedComponent)
  },
  {
    path: '',
    redirectTo: '/login',
    pathMatch: 'full'
  },
  {
    path: '**',
    redirectTo: '/dashboard'
  }
];
