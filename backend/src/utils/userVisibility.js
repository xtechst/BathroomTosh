function getRoleScopeFilter(currentRole, currentUserId, requestedRole, supervisorIds = []) {
  if (!currentUserId || !requestedRole) return null;

  const normalizedRole = requestedRole.toUpperCase();

  if (currentRole === 'TECH_ADMIN') {
    return { baseRole: normalizedRole };
  }

  if (currentRole !== 'MANAGER') {
    return null;
  }

  if (normalizedRole === 'SUPERVISOR') {
    return {
      baseRole: 'SUPERVISOR',
      managerId: currentUserId
    };
  }

  if (normalizedRole === 'STAFF') {
    return {
      $or: [
        { baseRole: 'STAFF', managerId: currentUserId },
        { baseRole: 'STAFF', supervisorId: { $in: supervisorIds } }
      ]
    };
  }

  return null;
}

function buildManagerTeamQuery(managerId, supervisorIds = []) {
  return {
    $or: [
      { baseRole: 'SUPERVISOR', managerId },
      { baseRole: 'STAFF', managerId },
      { baseRole: 'STAFF', supervisorId: { $in: supervisorIds } }
    ]
  };
}

module.exports = {
  getRoleScopeFilter,
  buildManagerTeamQuery
};
