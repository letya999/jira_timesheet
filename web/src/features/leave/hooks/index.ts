import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  getMyLeaveRequestsApiV1LeavesMyGet,
  getAllLeaveRequestsApiV1LeavesAllGet,
  createLeaveRequestApiV1LeavesPost,
  updateLeaveStatusApiV1LeavesLeaveIdPatch,
} from '../../../api/generated/sdk.gen';

export const leaveKeys = {
  all: () => ['leave'] as const,
  my: (params?: object) => ['leave', 'my', params] as const,
  team: (params?: object) => ['leave', 'team', params] as const,
};

export function useLeaveRequests(params?: { start_date?: string; end_date?: string }) {
  return useQuery({
    queryKey: leaveKeys.my(params),
    queryFn: async () => {
      const res = await getMyLeaveRequestsApiV1LeavesMyGet({ throwOnError: true, query: params });
      return res.data;
    },
  });
}

export function useAllLeaveRequests(params?: { start_date?: string; end_date?: string }) {
  return useQuery({
    queryKey: leaveKeys.team(params),
    queryFn: async () => {
      const res = await getAllLeaveRequestsApiV1LeavesAllGet({ throwOnError: true, query: params });
      return res.data;
    },
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
      status: string;
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
