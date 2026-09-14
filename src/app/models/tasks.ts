/**
 * Task & Area Management Models
 * Entity Mapping: Tasks are children of Areas
 */

export enum AreaName {
  KITCHEN = 'KITCHEN',
  BATHROOM = 'BATHROOM'
}

export interface ChecklistItem {
  id?: string;
  name: string;
  isBoolean: boolean; // True/False toggle items
  isToggled?: boolean;
  isCompleted?: boolean;
}

export interface TaskNote {
  id: string;
  userId: string;
  userName: string;
  content: string;
  noteType: 'STAFF_NOTE' | 'FEEDBACK'; // Staff adds Notes, Supervisors add Feedback
  createdAt: Date;
  immutable: boolean; // Cannot be deleted once saved
}

export interface ThreadedComment {
  id: string;
  parentNoteId: string;
  userId: string;
  userName: string;
  content: string;
  createdAt: Date;
  immutable: boolean;
}

export interface Task {
  id?: string;
  _id?: string;
  areaId?: string;
  areaName?: AreaName;
  area?: string; // KITCHEN or BATHROOM
  title: string;
  description?: string;
  assignedTo?: string; // Staff member ID
  assignedBy?: string; // Supervisor ID
  checklistItems?: ChecklistItem[];
  checklist?: ChecklistItem[];
  notes?: TaskNote[];
  threadedComments?: ThreadedComment[]; // Linked directly to specific notes
  status?: 'NOT_STARTED' | 'IN_PROGRESS' | 'AWAITING_REVIEW' | 'COMPLETED' | 'BLOCKED' | 'PENDING' | 'CANCELLED';
  taskAcceptance?: 'PENDING' | 'ACCEPTED' | 'REJECTED';
  acceptedAt?: Date;
  rejectedAt?: Date;
  rejectionReason?: string;
  proofDocuments?: Array<{
    originalName: string;
    path: string;
    mimeType: string;
    size: number;
    uploadedAt?: Date;
  }>;
  priority?: 'LOW' | 'MEDIUM' | 'HIGH';
  recurrence?: 'NONE' | 'WEEKLY' | 'MONTHLY';
  assignedDate?: Date;
  dueDate?: Date | string;
  completedAt?: Date;
  completedBy?: string;
  createdAt?: Date;
  isChecklistComplete?: boolean; // Validation: all boolean items must be toggled
}

/**
 * Strict Leave Constraints:
 * System must validate that Staff cannot be assigned tasks on approved leave dates
 */
export interface Area {
  id: string;
  name: AreaName;
  description: string;
  supervisorId: string;
  tasks: Task[];
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Active Delegate Lock:
 * While a delegate is active, the original Supervisor/Manager is in Audit Mode (Read-Only)
 */
export interface DelegateAuditLock {
  id: string;
  delegateAssignmentId: string;
  originalUserId: string;
  isActive: boolean;
  startTime: Date;
  endTime: Date;
  createdAt: Date;
}

export interface TaskAssignmentValidation {
  isValid: boolean;
  errors: string[];
  warnings?: string[];
}
