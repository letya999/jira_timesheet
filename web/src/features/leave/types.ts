import { startOfMonth, endOfMonth } from 'date-fns';
import type { DateRange } from 'react-day-picker';
import type { LeaveStatus, LeaveType } from '@/api/generated/types.gen';

export type LeaveTab = 'overview' | 'my' | 'management';

export interface LeaveFilters {
  dateRange: DateRange;
  teamIds: number[];
  employeeIds: number[];
  leaveTypes: LeaveType[];
  statuses: LeaveStatus[];
}

export const LEAVE_STATUS_OPTIONS: Array<{ value: LeaveStatus; label: string }> = [
  { value: 'PENDING', label: 'Pending' },
  { value: 'APPROVED', label: 'Approved' },
  { value: 'REJECTED', label: 'Rejected' },
  { value: 'CANCELLED', label: 'Cancelled' },
];

export function createDefaultLeaveFilters(baseDate = new Date()): LeaveFilters {
  return {
    dateRange: {
      from: startOfMonth(baseDate),
      to: endOfMonth(baseDate),
    },
    teamIds: [],
    employeeIds: [],
    leaveTypes: [],
    statuses: [],
  };
}
