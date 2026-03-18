export type AppRole = "admin" | "manager" | "employee" | "unknown";

function normalizeRoleToken(raw: string): string {
  return raw.trim().toLowerCase().replace(/[_\s-]+/g, " ");
}

export function normalizeAppRole(rawRole: string | null | undefined): AppRole {
  if (!rawRole) return "unknown";
  const role = normalizeRoleToken(rawRole);

  if (role === "admin" || role === "ceo") return "admin";

  if (
    role === "pm" ||
    role === "manager" ||
    role === "project manager" ||
    role === "team lead" ||
    role === "teamlead" ||
    role === "projectmanager"
  ) {
    return "manager";
  }

  if (role === "employee") return "employee";
  return "unknown";
}

export function isAdminRole(rawRole: string | null | undefined): boolean {
  return normalizeAppRole(rawRole) === "admin";
}

export function isManagerRole(rawRole: string | null | undefined): boolean {
  return normalizeAppRole(rawRole) === "manager";
}

export function canAccessManagerPages(rawRole: string | null | undefined): boolean {
  const role = normalizeAppRole(rawRole);
  return role === "admin" || role === "manager";
}

export function isLeadershipRoleLabel(rawRole: string | null | undefined): boolean {
  return normalizeAppRole(rawRole) === "manager";
}
