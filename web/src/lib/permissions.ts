export type Permission =
  | 'reports.view'
  | 'reports.export'
  | 'hr:read'
  | 'employees.manage'
  | 'projects.manage'
  | 'approvals.manage'
  | 'settings.manage'
  | 'sync.manage'
  | 'org.view'
  | 'timesheet.manage';

export type Role = 'admin' | 'manager' | 'employee' | 'hr';

export const ROLE_PERMISSIONS: Record<Role, Set<Permission>> = {
  admin: new Set([
    'reports.view',
    'reports.export',
    'hr:read',
    'employees.manage',
    'projects.manage',
    'approvals.manage',
    'settings.manage',
    'sync.manage',
    'org.view',
    'timesheet.manage',
  ]),
  manager: new Set([
    'reports.view',
    'reports.export',
    'employees.manage',
    'projects.manage',
    'approvals.manage',
    'org.view',
    'timesheet.manage',
  ]),
  hr: new Set([
    'hr:read',
    'employees.manage',
    'org.view',
    'timesheet.manage',
  ]),
  employee: new Set([
    'org.view',
    'timesheet.manage',
  ]),
};

/** Derive a flat permission set from an array of role strings (union). */
export function buildPermissionsFromRoles(roles: string[]): Permission[] {
  const result = new Set<Permission>();
  for (const role of roles) {
    const perms = ROLE_PERMISSIONS[role as Role];
    if (perms) {
      for (const p of perms) result.add(p);
    }
  }
  return Array.from(result);
}
