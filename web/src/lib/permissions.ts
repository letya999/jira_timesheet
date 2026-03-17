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
  | 'timesheet.manage'
  | 'ai-chat:read'
  | 'ai-chat:train';

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
    'ai-chat:read',
    'ai-chat:train',
  ]),
  manager: new Set([
    'reports.view',
    'reports.export',
    'employees.manage',
    'projects.manage',
    'approvals.manage',
    'org.view',
    'timesheet.manage',
    'ai-chat:read',
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

function normalizeRole(role: string): Role | null {
  const normalized = role.trim().toLowerCase().replace(/[_-]+/g, ' ');
  if (normalized === 'admin' || normalized === 'ceo') return 'admin';
  if (
    normalized === 'manager' ||
    normalized === 'pm' ||
    normalized === 'project manager' ||
    normalized === 'projectmanager' ||
    normalized === 'team lead' ||
    normalized === 'teamlead'
  ) return 'manager';
  if (normalized === 'employee') return 'employee';
  if (normalized === 'hr') return 'hr';
  return null;
}

/** Derive a flat permission set from an array of role strings (union). */
export function buildPermissionsFromRoles(roles: string[]): Permission[] {
  const result = new Set<Permission>();
  for (const rawRole of roles) {
    const role = normalizeRole(rawRole);
    if (!role) continue;
    const perms = ROLE_PERMISSIONS[role];
    if (perms) {
      for (const p of perms) result.add(p);
    }
  }
  return Array.from(result);
}
