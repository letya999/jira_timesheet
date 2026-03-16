import { describe, it, expect } from 'vitest';
import { ROLE_PERMISSIONS, buildPermissionsFromRoles } from './permissions';

describe('ROLE_PERMISSIONS', () => {
  it('admin has all permissions', () => {
    const admin = ROLE_PERMISSIONS.admin;
    expect(admin.has('reports.view')).toBe(true);
    expect(admin.has('hr:read')).toBe(true);
    expect(admin.has('settings.manage')).toBe(true);
    expect(admin.has('sync.manage')).toBe(true);
    expect(admin.has('employees.manage')).toBe(true);
  });

  it('employee only has basic permissions', () => {
    const emp = ROLE_PERMISSIONS.employee;
    expect(emp.has('org.view')).toBe(true);
    expect(emp.has('timesheet.manage')).toBe(true);
    expect(emp.has('hr:read')).toBe(false);
    expect(emp.has('reports.view')).toBe(false);
    expect(emp.has('settings.manage')).toBe(false);
  });

  it('hr role has hr:read but not settings.manage', () => {
    const hr = ROLE_PERMISSIONS.hr;
    expect(hr.has('hr:read')).toBe(true);
    expect(hr.has('employees.manage')).toBe(true);
    expect(hr.has('settings.manage')).toBe(false);
    expect(hr.has('reports.view')).toBe(false);
  });

  it('manager has reports but not hr:read', () => {
    const mgr = ROLE_PERMISSIONS.manager;
    expect(mgr.has('reports.view')).toBe(true);
    expect(mgr.has('approvals.manage')).toBe(true);
    expect(mgr.has('hr:read')).toBe(false);
    expect(mgr.has('settings.manage')).toBe(false);
  });
});

describe('buildPermissionsFromRoles', () => {
  it('returns empty array for empty roles', () => {
    expect(buildPermissionsFromRoles([])).toEqual([]);
  });

  it('returns permissions for a single role', () => {
    const perms = buildPermissionsFromRoles(['hr']);
    expect(perms).toContain('hr:read');
    expect(perms).toContain('employees.manage');
    expect(perms).not.toContain('settings.manage');
  });

  it('unions permissions for multiple roles', () => {
    const perms = buildPermissionsFromRoles(['employee', 'hr']);
    expect(perms).toContain('hr:read');
    expect(perms).toContain('org.view');
    expect(perms).toContain('employees.manage');
    expect(perms).not.toContain('settings.manage');
  });

  it('ignores unknown role strings', () => {
    const perms = buildPermissionsFromRoles(['unknown_role']);
    expect(perms).toHaveLength(0);
  });

  it('deduplicates permissions when roles share them', () => {
    // Both admin and manager have 'reports.view'
    const perms = buildPermissionsFromRoles(['admin', 'manager']);
    const reportViewCount = perms.filter((p) => p === 'reports.view').length;
    expect(reportViewCount).toBe(1);
  });

  it('normalizes role casing and aliases (Admin/CEO/PM)', () => {
    const adminPerms = buildPermissionsFromRoles(['Admin']);
    expect(adminPerms).toContain('settings.manage');

    const ceoPerms = buildPermissionsFromRoles(['CEO']);
    expect(ceoPerms).toContain('settings.manage');

    const pmPerms = buildPermissionsFromRoles(['PM']);
    expect(pmPerms).toContain('reports.view');
    expect(pmPerms).not.toContain('settings.manage');
  });
});
