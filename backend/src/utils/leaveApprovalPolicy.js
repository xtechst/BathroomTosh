function sameId(left, right) {
  return Boolean(left && right && left.toString() === right.toString());
}

function hasAssignedSupervisor(user, supervisor) {
  return user.baseRole !== 'STAFF' || Boolean(
    user.supervisorId &&
    supervisor?.baseRole === 'SUPERVISOR' &&
    sameId(user.supervisorId, supervisor._id)
  );
}

function canApproveLeaveRequest({ approverRole, approverId, request, requester }) {
  if (approverRole === 'TECH_ADMIN') {
    return requester.baseRole === 'MANAGER';
  }

  if (approverRole === 'MANAGER') {
    if (request.autoEscalated) {
      return sameId(request.escalatedTo, approverId);
    }

    return requester.baseRole === 'SUPERVISOR' &&
      sameId(requester.managerId, approverId) &&
      sameId(request.escalatedTo, approverId);
  }

  return approverRole === 'SUPERVISOR' &&
    requester.baseRole === 'STAFF' &&
    sameId(requester.supervisorId, approverId) &&
    sameId(request.escalatedTo, approverId);
}

module.exports = { canApproveLeaveRequest, hasAssignedSupervisor };