import { vi, describe, it, expect, beforeEach } from 'vitest';
import { act, waitFor } from '@testing-library/react';
import { renderHookWithQuery } from '../../../test/render-with-providers';
import * as sdk from '../../../api/generated/sdk.gen';
import { 
  useProjects, 
  useUpdateProject, 
  useRefreshProjects,
  useSyncProjects,
  projectsKeys
} from './index';

// Mock the SDK
vi.mock('../../../api/generated/sdk.gen', () => ({
  getProjectsApiV1ProjectsGet: vi.fn(),
  updateProjectApiV1ProjectsProjectIdPatch: vi.fn(),
  refreshProjectsApiV1ProjectsRefreshPost: vi.fn(),
  syncSingleProjectApiV1ProjectsProjectIdSyncPost: vi.fn(),
  syncAllActiveProjectsApiV1ProjectsSyncAllPost: vi.fn(),
  getJobStatusApiV1SyncJobsJobIdGet: vi.fn(),
  getProjectSprintsApiV1ProjectsProjectIdSprintsGet: vi.fn(),
}));

describe('projects hooks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('useProjects calls getProjectsApiV1ProjectsGet', async () => {
    const mockData = { items: [], total: 0 };
    vi.mocked(sdk.getProjectsApiV1ProjectsGet).mockResolvedValue({ data: mockData } as any);
    const params = { page: 1, size: 10 };
    const { result } = renderHookWithQuery(() => useProjects(params));
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(sdk.getProjectsApiV1ProjectsGet).toHaveBeenCalledWith({ throwOnError: true, query: params });
    expect(result.current.data).toEqual(mockData);
  });

  it('useUpdateProject calls updateProjectApiV1ProjectsProjectIdPatch and invalidates', async () => {
    vi.mocked(sdk.updateProjectApiV1ProjectsProjectIdPatch).mockResolvedValue({ data: {} } as any);
    const { result, queryClient } = renderHookWithQuery(() => useUpdateProject());
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');
    await act(async () => {
      await result.current.mutateAsync({ id: 1, data: { is_active: false } });
    });
    expect(sdk.updateProjectApiV1ProjectsProjectIdPatch).toHaveBeenCalledWith({
      throwOnError: true,
      path: { project_id: 1 },
      body: { is_active: false },
    });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: projectsKeys.all() });
  });

  it('useRefreshProjects calls refreshProjectsApiV1ProjectsRefreshPost and invalidates', async () => {
    vi.mocked(sdk.refreshProjectsApiV1ProjectsRefreshPost).mockResolvedValue({ data: {} } as any);
    const { result, queryClient } = renderHookWithQuery(() => useRefreshProjects());
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');
    await act(async () => {
      await result.current.mutateAsync();
    });
    expect(sdk.refreshProjectsApiV1ProjectsRefreshPost).toHaveBeenCalledWith({ throwOnError: true });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: projectsKeys.all() });
  });

  describe('useSyncProjects', () => {
    it('syncs single project when id provided', async () => {
      vi.mocked(sdk.syncSingleProjectApiV1ProjectsProjectIdSyncPost).mockResolvedValue({ data: { job_id: '123' } } as any);
      const { result, queryClient } = renderHookWithQuery(() => useSyncProjects());
      const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');
      await act(async () => {
        await result.current.mutateAsync(1);
      });
      expect(sdk.syncSingleProjectApiV1ProjectsProjectIdSyncPost).toHaveBeenCalledWith({
        throwOnError: true,
        path: { project_id: 1 },
      });
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: projectsKeys.all() });
    });

    it('syncs all active projects when no id provided', async () => {
      vi.mocked(sdk.syncAllActiveProjectsApiV1ProjectsSyncAllPost).mockResolvedValue({ data: { job_id: '456' } } as any);
      const { result, queryClient } = renderHookWithQuery(() => useSyncProjects());
      const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');
      await act(async () => {
        await result.current.mutateAsync();
      });
      expect(sdk.syncAllActiveProjectsApiV1ProjectsSyncAllPost).toHaveBeenCalledWith({ throwOnError: true });
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: projectsKeys.all() });
    });
  });
});
