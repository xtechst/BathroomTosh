# BathroomTosh - Role-Based Access Control System

## Project Overview

BathroomTosh is a comprehensive **Role-Based Access Control (RBAC)** system for managing bathroom and kitchen facility operations with advanced delegation capabilities, audit logging, and task management.

---

## System Architecture

### Role Hierarchy

| Role | Responsibility | Data Scope | Key Permissions |
|------|----------------|-----------|-----------------|
| **Tech Admin** | System Configuration | Full Read/Write | System Config, User Management, Audit Logs |
| **Manager** | Strategic Oversight | Approve & Delegate | Leave Approval, Acting Role Initiation |
| **Supervisor** | Operational Logic | Task Management | Roster Management, Task Assignment, Task Feedback |
| **Staff** | Task Execution | Assigned Tasks Only | Task Completion, Add Notes |

---

## Critical Features Implemented

### 1. **Acting Role Logic (Temporal Overlay)**

The most critical feature: Acting roles are **time-bound delegation**, NOT permanent account changes.

#### Key Characteristics:
- **Time-Bound Window**: Acting roles have explicit `Acting_Start` and `Acting_End` timestamps
- **Automatic Reversion**: At `Acting_End + 1 second`, system forces session refresh and reverts user to `Base_Role`
- **Temporal Override**: User's effective role is temporarily overridden during the acting window
- **Audit Trail**: All acting assignments logged with "on behalf of" tracking

#### Implementation:
```typescript
// Acting assignments are purely temporal
const assignment: ActingAssignment = {
  originalUserId: "u2",        // Original supervisor
  delegateUserId: "u3",         // Acting as supervisor
  permissionsGranted: SUPERVISOR,
  startTime: Date,
  endTime: Date,               // CRITICAL: Strict expiration
  status: 'ACTIVE'
};

// Monitor every 5 seconds and force refresh if expired
if (now > acting.endTime) {
  acting.status = 'EXPIRED';
  setTimeout(() => window.location.reload(), 1000);
}
```

### 2. **The Approval Paradox Handler**

Prevents logical loops where Acting Supervisors approve their own leave.

#### Solution: Auto-Escalation
- If an Acting Supervisor requests leave for themselves → request **auto-escalates** to Manager/Tech Admin
- Original Supervisor cannot approve their own leave while acting
- All escalations logged with `autoEscalated: true` flag

```typescript
const isActingSupervisor = acting && 
  acting.delegateUserId === userId && 
  acting.permissionsGranted === BaseRole.SUPERVISOR;

if (isActingSupervisor) {
  leaveRequest.autoEscalated = true;
  leaveRequest.escalatedTo = 'MANAGER';  // Auto-escalate
}
```

### 3. **Audit Mode Lock**

While a delegate is active, the original user is restricted.

#### Rules:
- Original Supervisor/Manager enters **Read-Only** mode (Audit Mode)
- Cannot modify roster, assignments, or any data
- Can view all data for audit purposes
- Indicated by `DelegateAuditLock` tracking

```typescript
// Original user cannot perform write operations
if (user.id === acting.originalUserId && 
    route.data['requiresWrite'] === true) {
  return false;  // Block modification
}
```

### 4. **Checklist Integrity Validation**

Staff cannot mark tasks complete unless ALL boolean checklist items are toggled.

#### Implementation:
- Task has `ChecklistItem[]` with `isBoolean` flag
- `completeTask()` validates all boolean items are toggled
- Task status cannot be "COMPLETED" without full checklist validation

```typescript
const incompleteBooleanItems = task.checklist.filter(
  item => item.isBoolean && !item.isCompleted
);

if (incompleteBooleanItems.length > 0) {
  throw new Error(`Must toggle all ${incompleteBooleanItems.length} required items`);
}
```

### 5. **Immutable Notes System**

All notes are immutable once saved - cannot be deleted or modified.

#### Tags:
- **STAFF_NOTE**: Added by staff members
- **FEEDBACK**: Added by supervisors/managers
- Tagged with `immutable: true` at creation
- Provides traceability and compliance

### 6. **Threaded Comments**

Notes support threaded comments for context-specific feedback.

#### Use Case:
Staff reports: "Fridge leaking" → Supervisor's response is threaded directly to that note
- Each comment linked to parent note via `parentNoteId`
- Maintains context hierarchy
- All comments immutable

```typescript
interface ThreadedComment {
  id: string;
  parentNoteId: string;  // Links to parent note
  content: string;
  createdAt: Date;
  immutable: true;
}
```

### 7. **Strict Leave Constraints**

System prevents task assignment on approved leave dates.

#### Validation:
```typescript
const hasApprovedLeave = leaveRequests.some(leave =>
  leave.userId === assignedToUserId &&
  leave.status === 'APPROVED' &&
  dueDate >= leave.startDate &&
  dueDate <= leave.endDate
);

if (hasApprovedLeave) {
  throw new Error('Assignee has approved leave on task due date');
}
```

### 8. **Complete Audit Logging**

Every action is logged with full traceability.

#### Audit Log Entry:
```typescript
interface AuditLog {
  id: string;
  timestamp: Date;
  actionPerformerId: string;
  onBehalfOfId?: string;  // Tracks acting role actions
  action: string;
  actionDescription: string;
  affectedEntityId?: string;
  changes?: Record<string, unknown>;
  sessionId?: string;
}
```

#### Tracked Actions:
- User login/logout
- Acting role initiation/revocation/expiration
- Leave request submission and escalation
- Task creation, modification, completion
- Note additions
- Role changes

---

## Project Structure

```
src/app/
├── models/
│   ├── roles.ts           # RBAC enums and interfaces
│   ├── tasks.ts           # Task and area models
│   └── index.ts
├── services/
│   ├── auth.service.ts    # Authentication & RBAC core
│   ├── task.service.ts    # Task management with validation
│   └── index.ts
├── guards/
│   ├── auth.guard.ts      # Route guards by role/permission
│   └── index.ts
├── pages/
│   ├── login/
│   ├── dashboard/
│   ├── staff/
│   │   └── tasks/
│   ├── supervisor/
│   │   ├── roster/
│   │   └── assignments/
│   ├── manager/
│   │   ├── leave-approvals/
│   │   └── acting-roles/
│   ├── admin/
│   │   ├── system-config/
│   │   └── audit-logs/
│   └── unauthorized/
├── app.ts                 # Root component with header
├── app.routes.ts          # Route configuration
├── app.config.ts          # App configuration
└── app.html              # Root template with role display
```

---

## Key Services

### AuthService
**Location**: [src/app/services/auth.service.ts](src/app/services/auth.service.ts)

Manages:
- User authentication
- Effective role computation (considering acting assignments)
- Permission checking
- Acting role initiation/revocation
- Leave request submission with auto-escalation
- Audit log recording

**Critical Methods**:
- `login()` - Authenticate user
- `initiateActingRole()` - Create time-bound delegation
- `revokeActingRole()` - Revoke acting role
- `getEffectiveRole()` - Get role considering acting assignment
- `submitLeaveRequest()` - Submit with auto-escalation logic

### TaskService
**Location**: [src/app/services/task.service.ts](src/app/services/task.service.ts)

Manages:
- Task CRUD operations
- Area management
- Checklist validation
- Note management (immutable)
- Threaded comments
- Task assignment validation
- Leave constraint checking
- Audit mode enforcement

**Critical Methods**:
- `createTask()` - With full validation
- `completeTask()` - With checklist integrity check
- `addNoteToTask()` - With immutable tagging
- `addThreadedComment()` - Link comments to notes
- `validateTaskAssignment()` - Leave and audit mode checks

---

## Route Guards

### Guard Types Implemented

1. **staffGuard**: Authenticated users only
2. **supervisorGuard**: Supervisor and above
3. **managerGuard**: Manager and above
4. **techAdminGuard**: Tech Admin only
5. **permissionGuard**: Permission-based checks
6. **auditModeGuard**: Prevent writes when in audit mode

### Guard Usage in Routes

```typescript
{
  path: 'supervisor/roster',
  canActivate: [supervisorGuard],
  canDeactivate: [auditModeGuard],  // Block writes if delegate active
  data: { requiresWrite: true }
}
```

---

## Components

### Login Component
- Simple, clean login interface
- Demo credentials provided
- Error handling

### Dashboard Component
- Role-aware action cards
- Displays effective role and acting status
- Quick access to all available pages
- Shows current permissions

### Page Components
All page components are role-specific stubs with feature descriptions:
- Staff: Task execution interface
- Supervisor: Roster and assignment management
- Manager: Leave approvals and acting role delegation
- Admin: System configuration and audit logs

---

## Data Models

### User
```typescript
interface User {
  id: string;
  username: string;
  email: string;
  baseRole: BaseRole;
  createdAt: Date;
}
```

### ActingAssignment
```typescript
interface ActingAssignment {
  id: string;
  originalUserId: string;
  delegateUserId: string;
  permissionsGranted: BaseRole;
  startTime: Date;
  endTime: Date;              // CRITICAL: Strict temporal bound
  status: 'PENDING' | 'ACTIVE' | 'EXPIRED' | 'REVOKED';
  approvedBy?: string;
  approvedAt?: Date;
}
```

### Task
```typescript
interface Task {
  id: string;
  areaId: string;
  areaName: AreaName;
  title: string;
  description: string;
  assignedTo?: string;
  assignedBy?: string;
  checklist: ChecklistItem[];
  notes: TaskNote[];
  threadedComments: ThreadedComment[];
  status: 'NOT_STARTED' | 'IN_PROGRESS' | 'AWAITING_REVIEW' | 'COMPLETED' | 'BLOCKED';
  assignedDate: Date;
  dueDate: Date;
  completedAt?: Date;
  completedBy?: string;
  isChecklistComplete: boolean;  // Must be true to complete
}
```

### TaskNote
```typescript
interface TaskNote {
  id: string;
  userId: string;
  userName: string;
  content: string;
  noteType: 'STAFF_NOTE' | 'FEEDBACK';
  createdAt: Date;
  immutable: true;  // Cannot be deleted
}
```

### AuditLog
```typescript
interface AuditLog {
  id: string;
  timestamp: Date;
  actionPerformerId: string;
  onBehalfOfId?: string;        // Tracks acting role actions
  action: string;
  actionDescription: string;
  affectedEntityId?: string;
  affectedEntityType?: string;
  changes?: Record<string, unknown>;
  sessionId?: string;
}
```

---

## Demo Credentials

Use these credentials to test different roles:

```
Admin (Tech Admin):
  Username: admin
  Password: admin123

Manager:
  Username: manager
  Password: manager123
```

---

## Critical Implementation Details

### 1. Acting Role Expiration Monitor
Runs every 5 seconds to check if any acting role has expired:
```typescript
interval(5000).subscribe(() => {
  if (now > acting.endTime) {
    // Force session refresh
    window.location.reload();
  }
});
```

### 2. Permission Hierarchy
Roles inherit permissions from lower levels:
- Tech Admin > Manager > Supervisor > Staff

### 3. Effective Role Computation
Always considers acting assignment:
```typescript
getEffectiveRole(): BaseRole {
  if (acting && acting.status === 'ACTIVE') {
    return acting.permissionsGranted;
  }
  return user.baseRole;
}
```

### 4. Task Assignment Validation
Performs multiple checks:
1. User has `canAssignTasks` permission
2. Assignee not on approved leave
3. Original user not in audit mode
4. Area assignment rules

---

## Security Considerations

1. **Immutable Audit Trail**: All notes and audit logs are immutable
2. **Temporal Boundary**: Acting roles strictly bounded by time
3. **Permission Checks**: Every action validated against permissions
4. **Audit Mode**: Read-only enforcement when delegate active
5. **Role Reversion**: Automatic reversion at temporal boundary + 1 second
6. **On-Behalf-Of Tracking**: Every acting role action logged

---

## Future Enhancements

1. Implement backend API integration
2. Add persistent data storage (database)
3. Implement real-time notifications for acting role expiration
4. Add report generation for audit logs
5. Implement approval workflows with multiple levels
6. Add bulk task assignment
7. Implement performance metrics and KPIs
8. Add two-factor authentication

---

## Testing

### Manual Testing Steps

1. **Login as Admin**
   - Navigate to System Configuration
   - View audit logs
   - Verify full access

2. **Login as Manager**
   - Approve leave requests
   - Create acting role for supervisor
   - Verify your supervisor enters audit mode

3. **Acting Role Expiration**
   - Create 1-minute acting role
   - Verify effective role changes
   - Wait for expiration and verify session refresh

4. **Leave Auto-Escalation**
   - Create acting supervisor
   - Have acting supervisor request leave
   - Verify auto-escalation to manager

---

## Compliance & Audit

This system provides:
- ✅ Complete audit trail
- ✅ Immutable records
- ✅ Role-based access control
- ✅ Temporal boundary enforcement
- ✅ Leave constraint validation
- ✅ Approval workflow tracking
- ✅ Session management with automatic refresh

Perfect for facility management compliance requirements.

---

## Contact & Support

For questions or issues, refer to the service implementations and model definitions in the `src/app/` directory.
