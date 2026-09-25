const { buildManagerTeamQuery, getRoleScopeFilter } = require('../src/utils/userVisibility');

describe('user visibility scoping', () => {
  test('manager team query includes supervisors and staff only', () => {
    const filter = buildManagerTeamQuery('manager-123');

    expect(filter).toEqual({
      $or: [
        { baseRole: 'SUPERVISOR', managerId: 'manager-123' },
        { baseRole: 'STAFF', managerId: 'manager-123' },
        { baseRole: 'STAFF', supervisorId: { $in: [] } }
      ]
    });
  });

  test('manager cannot request manager/admin roles through role filtering', () => {
    expect(getRoleScopeFilter('MANAGER', 'manager-123', 'MANAGER')).toBeNull();
    expect(getRoleScopeFilter('MANAGER', 'manager-123', 'TECH_ADMIN')).toBeNull();
    expect(getRoleScopeFilter('MANAGER', 'manager-123', 'SUPERVISOR')).toEqual({
      baseRole: 'SUPERVISOR',
      managerId: 'manager-123'
    });
    expect(getRoleScopeFilter('MANAGER', 'manager-123', 'STAFF')).toEqual({
      $or: [
        { baseRole: 'STAFF', managerId: 'manager-123' },
        { baseRole: 'STAFF', supervisorId: { $in: [] } }
      ]
    });
  });

  test('admin sees all roles for a requested scope', () => {
    expect(getRoleScopeFilter('TECH_ADMIN', 'anyone', 'MANAGER')).toEqual({ baseRole: 'MANAGER' });
    expect(getRoleScopeFilter('TECH_ADMIN', 'anyone', 'SUPERVISOR')).toEqual({ baseRole: 'SUPERVISOR' });
    expect(getRoleScopeFilter('TECH_ADMIN', 'anyone', 'STAFF')).toEqual({ baseRole: 'STAFF' });
  });
});
