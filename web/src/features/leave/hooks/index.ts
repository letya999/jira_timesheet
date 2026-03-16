import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  getMyLeaveRequestsApiV1LeavesMyGet,
  getTeamLeaveRequestsApiV1LeavesTeamGet,
  getAllLeaveRequestsApiV1LeavesAllGet,
  createLeaveRequestApiV1LeavesPost,
  updateLeaveStatusApiV1LeavesLeaveIdPatch,
} from '../../../api/generated/sdk.gen';
import type { LeaveStatus } from '@/api/generated/types.gen';

export const leaveKeys = {
  all: () => ['leave'] as const,
  my: (params?: object) => ['leave', 'my', params] as const,
  team: (params?: object) => ['leave', 'team', params] as const,
  allRequests: (params?: object) => ['leave', 'all', params] as const,
};

export function useLeaveRequests(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: leaveKeys.my(),
    queryFn: async () => {
      const res = await getMyLeaveRequestsApiV1LeavesMyGet({ throwOnError: true });
      return res.data;
    },
    enabled: options?.enabled ?? true,
  });
}

export function useTeamLeaveRequests(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: leaveKeys.team(),
    queryFn: async () => {
      const res = await getTeamLeaveRequestsApiV1LeavesTeamGet({ throwOnError: true });
      return res.data;
    },
    enabled: options?.enabled ?? true,
  });
}

export function useAllLeaveRequests(
  params?: { start_date?: string; end_date?: string },
  options?: { enabled?: boolean },
) {
  return useQuery({
    queryKey: leaveKeys.allRequests(params),
    queryFn: async () => {
      const res = await getAllLeaveRequestsApiV1LeavesAllGet({ throwOnError: true, query: params });
      return res.data;
    },
    enabled: options?.enabled ?? true,
  });
}

export function useCreateLeaveRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (body: {
      leave_type: string;
      start_date: string;
      end_date: string;
      reason?: string;
    }) => {
      const res = await createLeaveRequestApiV1LeavesPost({
        throwOnError: true,
        body,
      });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: leaveKeys.all() });
    },
  });
}

export function useUpdateLeaveStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      leaveId,
      status,
      comment,
    }: {
      leaveId: number;
      status: LeaveStatus;
      comment?: string;
    }) => {
      const res = await updateLeaveStatusApiV1LeavesLeaveIdPatch({
        throwOnError: true,
        path: { leave_id: leaveId },
        body: { status, comment },
      });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: leaveKeys.all() });
    },
  });
}
