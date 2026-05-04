import { vi, describe, it, expect, beforeEach } from 'vitest';
import { act, waitFor } from '@testing-library/react';
import { renderHookWithQuery } from '../../../test/render-with-providers';
import { 
  getEmployeesApiV1OrgEmployeesGet,
  updateEmployeeApiV1OrgEmployeesEmployeeIdPatch,
  syncUsersApiV1UsersSyncPost,
  promoteToSystemUserApiV1UsersPromoteJiraUserIdPost
} from '../../../api/generated/sdk.gen';
import { 
  useJiraUsers, 
  useUpdateJiraUser, 
  useSyncUsersFromJira, 
  usePromoteUser,
  usersKeys
} from './index';

// Mock the SDK
vi.mock('../../../api/generated/sdk.gen', () => ({
  getEmployeesApiV1OrgEmployeesGet: vi.fn(),
  updateEmployeeApiV1OrgEmployeesEmployeeIdPatch: vi.fn(),
  syncUsersApiV1UsersSyncPost: vi.fn(),
  promoteToSystemUserApiV1UsersPromoteJiraUserIdPost: vi.fn(),
  getUsersApiV1UsersGet: vi.fn(),
  updateUserApiV1UsersUserIdPatch: vi.fn(),
}));

describe('users hooks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('useJiraUsers', () => {
    it('calls getEmployeesApiV1OrgEmployeesGet with correct params', async () => {
      const mockData = { items: [], total: 0 };
      vi.mocked(getEmployeesApiV1OrgEmployeesGet).mockResolvedValue({ data: mockData } as any);

      const params = { page: 1, size: 10, search: 'test' };
      const { result } = renderHookWithQuery(() => useJiraUsers(params));

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(getEmployeesApiV1OrgEmployeesGet).toHaveBeenCalledWith({
        throwOnError: true,
        query: params,
      });
      expect(result.current.data).toEqual(mockData);
    });
  });

  describe('useUpdateJiraUser', () => {
    it('calls updateEmployeeApiV1OrgEmployeesEmployeeIdPatch and invalidates cache', async () => {
      vi.mocked(updateEmployeeApiV1OrgEmployeesEmployeeIdPatch).mockResolvedValue({ data: {} } as any);
      
      const { result, queryClient } = renderHookWithQuery(() => useUpdateJiraUser());
      const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

      const updateData = { id: 1, data: { is_active: false } };
      await act(async () => {
        await result.current.mutateAsync(updateData);
      });

      expect(updateEmployeeApiV1OrgEmployeesEmployeeIdPatch).toHaveBeenCalledWith({
        throwOnError: true,
        path: { employee_id: 1 },
        body: { is_active: false },
      });
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: usersKeys.employees() });
    });
  });

  describe('useSyncUsersFromJira', () => {
    it('calls syncUsersApiV1UsersSyncPost and invalidates cache', async () => {
      vi.mocked(syncUsersApiV1UsersSyncPost).mockResolvedValue({ data: {} } as any);

      const { result, queryClient } = renderHookWithQuery(() => useSyncUsersFromJira());
      const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

      await act(async () => {
        await result.current.mutateAsync();
      });

      expect(syncUsersApiV1UsersSyncPost).toHaveBeenCalledWith({ throwOnError: true });
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: usersKeys.employees() });
    });
  });

  describe('usePromoteUser', () => {
    it('calls promoteToSystemUserApiV1UsersPromoteJiraUserIdPost and invalidates caches', async () => {
      vi.mocked(promoteToSystemUserApiV1UsersPromoteJiraUserIdPost).mockResolvedValue({ data: {} } as any);

      const { result, queryClient } = renderHookWithQuery(() => usePromoteUser());
      const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

      await act(async () => {
        await result.current.mutateAsync({ jiraUserId: 123 });
      });

      expect(promoteToSystemUserApiV1UsersPromoteJiraUserIdPost).toHaveBeenCalledWith({
        throwOnError: true,
        path: { jira_user_id: 123 },
        body: undefined,
      });
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: usersKeys.employees() });
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: usersKeys.all() });
    });
  });
});
