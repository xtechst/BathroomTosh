/**
 * Role-Based Access Control (RBAC) Models
 * Hierarchical permission model with temporal overlay for acting roles
 */

export enum BaseRole {
  TECH_ADMIN = 'TECH_ADMIN',
  MANAGER = 'MANAGER',
  SUPERVISOR = 'SUPERVISOR',
  STAFF = 'STAFF'
}

export interface RolePermissions {
  canManageSystemConfig: boolean;
  canApproveLeave: boolean;
  canInitiateActingRole: boolean;
  canManageRoster: boolean;
  canAssignTasks: boolean;
  canViewAllStaffTasks: boolean;
  canExecuteTasks: boolean;
  canAddNotes: boolean;
  canDeleteNotes: boolean;
}

export const ROLE_PERMISSIONS: Record<BaseRole, RolePermissions> = {
  [BaseRole.TECH_ADMIN]: {
    canManageSystemConfig: true,
    canApproveLeave: true,
    canInitiateActingRole: true,
    canManageRoster: true,
    canAssignTasks: true,
    canViewAllStaffTasks: true,
    canExecuteTasks: false,
    canAddNotes: true,
    canDeleteNotes: true
  },
  [BaseRole.MANAGER]: {
    canManageSystemConfig: false,
    canApproveLeave: true,
    canInitiateActingRole: true,
    canManageRoster: true,
    canAssignTasks: true,
    canViewAllStaffTasks: true,
    canExecuteTasks: false,
    canAddNotes: true,
    canDeleteNotes: false
  },
  [BaseRole.SUPERVISOR]: {
    canManageSystemConfig: false,
    canApproveLeave: false,
    canInitiateActingRole: false,
    canManageRoster: true,
    canAssignTasks: true,
    canViewAllStaffTasks: true,
    canExecuteTasks: false,
    canAddNotes: true,
    canDeleteNotes: false
  },
  [BaseRole.STAFF]: {
    canManageSystemConfig: false,
    canApproveLeave: false,
    canInitiateActingRole: false,
    canManageRoster: false,
    canAssignTasks: false,
    canViewAllStaffTasks: false,
    canExecuteTasks: true,
    canAddNotes: true,
    canDeleteNotes: false
  }
};

export interface User {
  id?: string;
  _id?: string;
  username: string;
  email?: string;
  baseRole: BaseRole;
  firstName?: string;
  lastName?: string;
  isActive?: boolean;
  supervisorId?: User | string | null;
  createdAt?: Date;
  updatedAt?: Date;
}

/**
 * Acting Role: Time-bound delegation to prevent logic loops
 * Critical: Acting is NOT a permanent change, strictly temporal
 */
export interface ActingAssignment {
  id: string;
  originalUserId: string;
  delegateUserId: string;
  permissionsGranted: BaseRole; // The role being delegated
  startTime: Date;
  endTime: Date;
  status: 'PENDING' | 'ACTIVE' | 'EXPIRED' | 'REVOKED';
  createdAt: Date;
  approvedBy?: string;
  approvedAt?: Date;
  revokedAt?: Date;
  revokedBy?: string;
}

/**
 * The Approval Paradox Handler:
 * If an Acting Supervisor requests leave for themselves,
 * auto-escalates to Manager/Tech Admin to prevent self-approval
 */
export interface LeaveRequest {
  id: string;
  userId: string;
  startDate: Date;
  endDate: Date;
  reason: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  approvedBy?: string;
  approvedAt?: Date;
  rejectedAt?: Date;
  rejectionReason?: string;
  createdAt: Date;
  autoEscalated: boolean; // True if Acting Supervisor requested leave
  escalatedTo?: string; // Tech Admin or Manager ID
}

/**
 * Audit Log for complete traceability
 * Captures both regular actions and "on behalf of" actions
 */
export interface AuditLog {
  id: string;
  timestamp: Date;
  actionPerformerId: string;
  onBehalfOfId?: string; // NULL if not acting, tracks if action taken under Acting Role
  action: string;
  actionDescription: string;
  affectedEntityId?: string;
  affectedEntityType?: string;
  changes?: Record<string, unknown>;
  ipAddress?: string;
  sessionId?: string;
}
