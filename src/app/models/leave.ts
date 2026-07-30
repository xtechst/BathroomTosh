/**
 * Leave Management Models
 */

export enum LeaveType {
  ANNUAL = 'ANNUAL',
  SICK = 'SICK',
  OTHER_SICK = 'OTHER_SICK'
}

export enum LeaveStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  CANCELLED = 'CANCELLED'
}

export interface LeaveBalances {
  annual: number;
  sick: number;
  otherSick: number;
}

import { User } from './roles';

export interface LeaveRequest {
  id?: string;
  _id?: string;
  userId: string | User;
  leaveType: LeaveType;
  startDate: Date;
  endDate: Date;
  reason: string;
  status: LeaveStatus;
  autoEscalated?: boolean;
  escalatedTo?: string;
  approvedBy?: string;
  approvalNotes?: string;
  createdAt?: Date;
  updatedAt?: Date;
}