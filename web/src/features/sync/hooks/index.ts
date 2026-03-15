import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  syncMyWorklogsApiV1SyncWorklogsPost,
  syncAllProjectsEndpointApiV1SyncProjectsPost,
  getJobStatusApiV1SyncJobsJobIdGet,
} from '../../../api/generated/sdk.gen';

export const syncKeys = {
  all: () => ['sync'] as const,
  status: (jobId: string) => ['sync', 'status', jobId] as const,
};

// Poll a background job; stops polling when complete or failed
export function useSyncStatus(jobId: string | null) {
  return useQuery({
    queryKey: syncKeys.status(jobId ?? ''),
    queryFn: async () => {
      const res = await getJobStatusApiV1SyncJobsJobIdGet({
        throwOnError: true,
        path: { job_id: jobId! },
      });
      return res.data;
    },
    enabled: !!jobId,
    refetchInterval: (query) => {
      const status = (query.state.data as { status?: string } | undefined)?.status;
      return status === 'complete' || status === 'failed' ? false : 3_000;
    },
  });
}

export function useTriggerSync() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (scope: 'my-worklogs' | 'all-projects' = 'my-worklogs') => {
      if (scope === 'all-projects') {
        const res = await syncAllProjectsEndpointApiV1SyncProjectsPost({ throwOnError: true });
        return res.data;
      }
      const res = await syncMyWorklogsApiV1SyncWorklogsPost({ throwOnError: true });
      return res.data;
    },
    onSuccess: () => {
      // Invalidate timesheet entries so they refresh after sync completes
      queryClient.invalidateQueries({ queryKey: ['timesheet'] });
    },
  });
}
