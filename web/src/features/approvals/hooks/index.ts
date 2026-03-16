import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  getTeamPeriodsApiV1ApprovalsTeamPeriodsGet,
  getMyPeriodApiV1ApprovalsMyPeriodGet,
  approvePeriodApiV1ApprovalsPeriodIdApprovePost,
  submitPeriodApiV1ApprovalsSubmitPost,
} from '../../../api/generated/sdk.gen';

export const approvalsKeys = {
  all: () => ['approvals'] as const,
  teamPeriods: (params?: object) => ['approvals', 'team-periods', params] as const,
  myPeriod: (params?: object) => ['approvals', 'my-period', params] as const,
};

export function useApprovals(params: { start_date: string; end_date: string; status?: string; org_unit_id?: number }) {
  return useQuery({
    queryKey: approvalsKeys.teamPeriods(params),
    queryFn: async () => {
      const res = await getTeamPeriodsApiV1ApprovalsTeamPeriodsGet({
        throwOnError: true,
        query: params,
      });
      return res.data;
    },
  });
}

export function useMyApprovalPeriod(params: { start_date: string; end_date: string }) {
  return useQuery({
    queryKey: approvalsKeys.myPeriod(params),
    queryFn: async () => {
      const res = await getMyPeriodApiV1ApprovalsMyPeriodGet({
        throwOnError: true,
        query: {
          target_date: params.start_date, // Based on TSC error, it might expect target_date
        },
      });
      return res.data;
    },
  });
}

export function useApproveEntry() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ periodId, comment }: { periodId: number; comment?: string }) => {
      const res = await approvePeriodApiV1ApprovalsPeriodIdApprovePost({
        throwOnError: true,
        path: { period_id: periodId },
        body: { status: 'approved', comment },
      });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: approvalsKeys.all() });
    },
  });
}

export function useRejectEntry() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ periodId, comment }: { periodId: number; comment?: string }) => {
      const res = await approvePeriodApiV1ApprovalsPeriodIdApprovePost({
        throwOnError: true,
        path: { period_id: periodId },
        body: { status: 'rejected', comment },
      });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: approvalsKeys.all() });
    },
  });
}

export function useBulkApprove() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (periodIds: number[]) => {
      const results = await Promise.all(
        periodIds.map((periodId) =>
          approvePeriodApiV1ApprovalsPeriodIdApprovePost({
            throwOnError: true,
            path: { period_id: periodId },
            body: { status: 'approved' },
          }),
        ),
      );
      return results.map((r) => r.data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: approvalsKeys.all() });
    },
  });
}

export function useSubmitPeriod() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: { start_date: string; end_date: string }) => {
      const res = await submitPeriodApiV1ApprovalsSubmitPost({
        throwOnError: true,
        body: params,
      });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: approvalsKeys.all() });
    },
  });
}
