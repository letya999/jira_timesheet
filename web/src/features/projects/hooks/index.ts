import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  getProjectsApiV1ProjectsGet,
  syncAllActiveProjectsApiV1ProjectsSyncAllPost,
  syncSingleProjectApiV1ProjectsProjectIdSyncPost,
  getJobStatusApiV1SyncJobsJobIdGet,
  updateProjectApiV1ProjectsProjectIdPatch,
  refreshProjectsApiV1ProjectsRefreshPost,
  getProjectSprintsApiV1ProjectsProjectIdSprintsGet,
} from '../../../api/generated/sdk.gen';

export const projectsKeys = {
  all: () => ['projects'] as const,
  list: (params?: object) => ['projects', 'list', params] as const,
  detail: (id: number) => ['projects', 'detail', id] as const,
  syncStatus: (jobId: string) => ['projects', 'sync-status', jobId] as const,
  refresh: () => ['projects', 'refresh'] as const,
  sprints: (projectId: number) => ['projects', 'detail', projectId, 'sprints'] as const,
};

export function useProjectSprints(projectId: number) {
  return useQuery({
    queryKey: projectsKeys.sprints(projectId),
    queryFn: async () => {
      const res = await getProjectSprintsApiV1ProjectsProjectIdSprintsGet({
        throwOnError: true,
        path: { project_id: projectId },
      });
      return res.data;
    },
    enabled: !!projectId,
  });
}

export function useProjects(params?: { page?: number; size?: number; is_active?: boolean; search?: string }) {
  return useQuery({
    queryKey: projectsKeys.list(params),
    queryFn: async () => {
      const res = await getProjectsApiV1ProjectsGet({ 
        throwOnError: true, 
        query: params as any
      });
      return res.data;
    },
  });
}

export function useProject(id: number) {
  return useQuery({
    queryKey: projectsKeys.detail(id),
    queryFn: async () => {
      const res = await getProjectsApiV1ProjectsGet({ throwOnError: true });
      const projects = Array.isArray(res.data) ? res.data : [];
      return projects.find((p: { id: number }) => p.id === id) ?? null;
    },
    enabled: id > 0,
  });
}

export function useUpdateProject() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: number; data: { is_active?: boolean } }) => {
      const res = await updateProjectApiV1ProjectsProjectIdPatch({
        throwOnError: true,
        path: { project_id: id },
        body: data,
      });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: projectsKeys.all() });
    },
  });
}

export function useRefreshProjects() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const res = await refreshProjectsApiV1ProjectsRefreshPost({ throwOnError: true });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: projectsKeys.all() });
    },
  });
}

export function useSyncProjects() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (projectId?: number) => {
      if (projectId) {
        const res = await syncSingleProjectApiV1ProjectsProjectIdSyncPost({
          throwOnError: true,
          path: { project_id: projectId },
        });
        return res.data as { job_id: string };
      }
      const res = await syncAllActiveProjectsApiV1ProjectsSyncAllPost({ throwOnError: true });
      return res.data as { job_id: string };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: projectsKeys.all() });
    },
  });
}

// Poll sync job status — enabled only when a jobId is provided
export function useProjectSyncStatus(jobId: string | null) {
  return useQuery({
    queryKey: projectsKeys.syncStatus(jobId ?? ''),
    queryFn: async () => {
      const res = await getJobStatusApiV1SyncJobsJobIdGet({
        throwOnError: true,
        path: { job_id: jobId! },
      });
      return res.data as { status: string; progress?: number; error?: string; result?: unknown };
    },
    enabled: !!jobId,
    // Poll every 3s while job is running; component should set enabled=false once done
    refetchInterval: (query) => {
      const status = (query.state.data as { status?: string } | undefined)?.status;
      return status === 'complete' || status === 'failed' ? false : 3_000;
    },
  });
}
