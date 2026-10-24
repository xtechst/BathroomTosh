const { canApproveLeaveRequest, hasAssignedSupervisor } = require('../src/utils/leaveApprovalPolicy');

describe('leave approval policy', () => {
  const request = { escalatedTo: 'approver-1', autoEscalated: false };

  test('admins can action manager requests but only view other roles', () => {
    const approval = { approverRole: 'TECH_ADMIN', approverId: 'admin-1', request };

    expect(canApproveLeaveRequest({ ...approval, requester: { baseRole: 'MANAGER' } })).toBe(true);
    expect(canApproveLeaveRequest({ ...approval, requester: { baseRole: 'SUPERVISOR' } })).toBe(false);
    expect(canApproveLeaveRequest({ ...approval, requester: { baseRole: 'STAFF' } })).toBe(false);
  });

  test('managers can action only their assigned supervisors', () => {
    const approval = { approverRole: 'MANAGER', approverId: 'approver-1', request };

    expect(canApproveLeaveRequest({
      ...approval,
      requester: { baseRole: 'SUPERVISOR', managerId: 'approver-1' }
    })).toBe(true);
    expect(canApproveLeaveRequest({
      ...approval,
      requester: { baseRole: 'SUPERVISOR', managerId: 'manager-2' }
    })).toBe(false);
  });

  test('managers can action acting-supervisor requests escalated to them', () => {
    expect(canApproveLeaveRequest({
      approverRole: 'MANAGER',
      approverId: 'approver-1',
      request: { escalatedTo: 'approver-1', autoEscalated: true },
      requester: { baseRole: 'STAFF' }
    })).toBe(true);
    expect(canApproveLeaveRequest({
      approverRole: 'MANAGER',
      approverId: 'manager-2',
      request: { escalatedTo: 'approver-1', autoEscalated: true },
      requester: { baseRole: 'STAFF' }
    })).toBe(false);
  });

  test('supervisors can action only staff assigned to them', () => {
    const approval = { approverRole: 'SUPERVISOR', approverId: 'approver-1', request };

    expect(canApproveLeaveRequest({
      ...approval,
      requester: { baseRole: 'STAFF', supervisorId: 'approver-1' }
    })).toBe(true);
    expect(canApproveLeaveRequest({
      ...approval,
      requester: { baseRole: 'STAFF', supervisorId: 'supervisor-2' }
    })).toBe(false);
  });

  test('staff leave requires a valid assigned supervisor', () => {
    expect(hasAssignedSupervisor(
      { baseRole: 'STAFF', supervisorId: 'supervisor-1' },
      { _id: 'supervisor-1', baseRole: 'SUPERVISOR' }
    )).toBe(true);
    expect(hasAssignedSupervisor(
      { baseRole: 'STAFF', supervisorId: 'supervisor-1' },
      { _id: 'supervisor-1', baseRole: 'STAFF' }
    )).toBe(false);
    expect(hasAssignedSupervisor({ baseRole: 'STAFF' }, null)).toBe(false);
  });
});