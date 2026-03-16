import { isAfter, isBefore, parseISO } from 'date-fns';
import type { JiraUserResponse, LeaveResponse, LeaveType } from '@/api/generated/types.gen';
import type { LeaveFilters } from './types';

export function buildUserOrgUnitMap(users: JiraUserResponse[]): Map<number, number | null> {
  const map = new Map<number, number | null>();
  for (const user of users) {
    const orgUnitId = user.org_unit_id ?? null;
    map.set(user.id, orgUnitId);
    if (typeof user.user_id === 'number') {
      map.set(user.user_id, orgUnitId);
    }
  }
  return map;
}

function isInDateRange(request: LeaveResponse, from?: Date, to?: Date): boolean {
  if (!from && !to) return true;

  const requestStart = parseISO(request.start_date);
  const requestEnd = parseISO(request.end_date);

  if (from && isBefore(requestEnd, from)) return false;
  if (to && isAfter(requestStart, to)) return false;

  return true;
}

export function applyLeaveFilters(
  requests: LeaveResponse[],
  filters: LeaveFilters,
  userOrgMap: Map<number, number | null>,
  options?: { ignoreOrgFilters?: boolean },
): LeaveResponse[] {
  const ignoreOrgFilters = options?.ignoreOrgFilters ?? false;
  const from = filters.dateRange.from;
  const to = filters.dateRange.to;

  return requests.filter((request) => {
    if (!isInDateRange(request, from, to)) return false;

    if (!ignoreOrgFilters && filters.teamIds.length > 0) {
      const orgUnitId = userOrgMap.get(request.user_id) ?? null;
      if (!orgUnitId || !filters.teamIds.includes(orgUnitId)) return false;
    }

    if (!ignoreOrgFilters && filters.employeeIds.length > 0 && !filters.employeeIds.includes(request.user_id)) {
      return false;
    }

    if (filters.leaveTypes.length > 0) {
      const type = (request.type ?? 'OTHER') as LeaveType;
      if (!filters.leaveTypes.includes(type)) return false;
    }

    if (filters.statuses.length > 0 && !filters.statuses.includes(request.status)) {
      return false;
    }

    return true;
  });
}

export function mapRequestsToTimelineData(requests: LeaveResponse[]) {
  const usersById = new Map<string, { id: string; name: string; avatarUrl?: string }>();

  for (const req of requests) {
    const userId = String(req.user_id);
    if (!usersById.has(userId)) {
      usersById.set(userId, {
        id: userId,
        name: req.user_full_name || `User ${req.user_id}`,
        avatarUrl: req.user_avatar_url ?? undefined,
      });
    }
  }

  const users = Array.from(usersById.values()).sort((a, b) => a.name.localeCompare(b.name));
  const entries = requests.map((req) => ({
    id: String(req.id),
    userId: String(req.user_id),
    userName: req.user_full_name || `User ${req.user_id}`,
    userAvatar: req.user_avatar_url ?? undefined,
    type: (req.type ?? 'OTHER') as LeaveType,
    status: req.status,
    startDate: parseISO(req.start_date),
    endDate: parseISO(req.end_date),
    reason: req.reason ?? undefined,
  }));

  return { users, entries };
}
