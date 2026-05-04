import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  getUsersApiV1UsersGet,
  updateUserApiV1UsersUserIdPatch,
  getEmployeesApiV1OrgEmployeesGet,
  updateEmployeeApiV1OrgEmployeesEmployeeIdPatch,
  syncUsersApiV1UsersSyncPost,
  promoteToSystemUserApiV1UsersPromoteJiraUserIdPost,
  bulkUpdateUsersApiV1UsersBulkUpdatePost,
  resetUserPasswordApiV1UsersResetPasswordUserIdPost,
  mergeUsersApiV1UsersMergePost,
  deleteUserApiV1UsersUserIdDelete,
} from '../../../api/generated/sdk.gen';
import type { UserType } from '@/api/generated/types.gen';
import { client } from '@/api/client';

export const usersKeys = {
  all: () => ['users'] as const,
  list: (params?: object) => ['users', 'list', params] as const,
  detail: (id: number) => ['users', 'detail', id] as const,
  workload: (id: number) => ['users', 'workload', id] as const,
  employees: (params?: object) => ['users', 'employees', params] as const,
};

export function useUsers(params?: {
  page?: number;
  size?: number;
  search?: string;
  type?: UserType;
  org_unit_id?: number;
  enabled?: boolean;
}) {
  const { enabled = true, ...queryParams } = params ?? {};
  return useQuery({
    queryKey: usersKeys.list(queryParams),
    queryFn: async () => {
      const res = await getUsersApiV1UsersGet({
        throwOnError: true,
        query: queryParams
      });
      return res.data;
    },
    enabled,
  });
}

interface BulkUpdateData {
  role?: string;
  org_unit_ids?: number[];
  is_active?: boolean;
}

export function useBulkUpdateUsers() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ userIds, data }: { userIds: number[]; data: BulkUpdateData }) => {
      const res = await bulkUpdateUsersApiV1UsersBulkUpdatePost({
        throwOnError: true,
        body: { user_ids: userIds, data } as Parameters<typeof bulkUpdateUsersApiV1UsersBulkUpdatePost>[0]['body'],
      });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: usersKeys.all() });
    },
  });
}

export function useResetPassword() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (userId: number) => {
      const res = await resetUserPasswordApiV1UsersResetPasswordUserIdPost({
        throwOnError: true,
        path: { user_id: userId },
      });
      return res.data;
    },
    onSuccess: (_, userId) => {
      queryClient.invalidateQueries({ queryKey: usersKeys.detail(userId) });
      queryClient.invalidateQueries({ queryKey: usersKeys.all() });
    },
  });
}

export function useMergeUsers() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ jiraUserId, systemUserId }: { jiraUserId: number; systemUserId: number }) => {
      const res = await mergeUsersApiV1UsersMergePost({
        throwOnError: true,
        query: { jira_user_id: jiraUserId, system_user_id: systemUserId },
      });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: usersKeys.all() });
    },
  });
}

export function useDeleteUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (userId: number) => {
      const res = await deleteUserApiV1UsersUserIdDelete({
        throwOnError: true,
        path: { user_id: userId },
      });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: usersKeys.all() });
    },
  });
}

export interface CreateSystemUserPayload {
  email: string;
  full_name: string;
  role?: string;
  timezone?: string;
  password?: string;
  jira_user_id?: number;
  org_unit_ids?: number[];
}

export function useCreateSystemUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: CreateSystemUserPayload) => {
      const res = await client.post({
        throwOnError: true,
        url: '/api/v1/users/',
        body: payload,
        headers: {
          'Content-Type': 'application/json',
        },
      });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: usersKeys.employees() });
      queryClient.invalidateQueries({ queryKey: usersKeys.all() });
    },
  });
}

export function useUser(id: number) {
  return useQuery({
    queryKey: usersKeys.detail(id),
    queryFn: async () => {
      // Backend exposes users list — find the user by ID
      const res = await getUsersApiV1UsersGet({ throwOnError: true });
      const users = Array.isArray(res.data) ? res.data : [];
      return users.find((u: { id: number }) => u.id === id) ?? null;
    },
    enabled: id > 0,
  });
}

export function useUpdateUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Record<string, unknown> }) => {
      const res = await updateUserApiV1UsersUserIdPatch({
        throwOnError: true,
        path: { user_id: id },
        body: data as Parameters<typeof updateUserApiV1UsersUserIdPatch>[0]['body'],
      });
      return res.data;
    },
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: usersKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: usersKeys.all() });
    },
  });
}

export function useUserWorkload(userId: number) {
  return useQuery({
    queryKey: usersKeys.workload(userId),
    queryFn: async () => {
      const res = await getEmployeesApiV1OrgEmployeesGet({ throwOnError: true });
      const employees = Array.isArray(res.data) ? res.data : (res.data as any)?.items || [];
      return employees.find((e: { id: number }) => e.id === userId) ?? null;
    },
    enabled: userId > 0,
  });
}

export function useJiraUsers(params?: { page?: number; size?: number; search?: string; org_unit_id?: number }) {
  return useQuery({
    queryKey: usersKeys.employees(params),
    queryFn: async () => {
      const res = await getEmployeesApiV1OrgEmployeesGet({ 
        throwOnError: true, 
        query: params as any
      });
      return res.data;
    },
  });
}

export function useUpdateJiraUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Record<string, unknown> }) => {
      const res = await updateEmployeeApiV1OrgEmployeesEmployeeIdPatch({
        throwOnError: true,
        path: { employee_id: id },
        body: data as Parameters<typeof updateEmployeeApiV1OrgEmployeesEmployeeIdPatch>[0]['body'],
      });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: usersKeys.employees() });
    },
  });
}

export function useSyncUsersFromJira() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const res = await syncUsersApiV1UsersSyncPost({ throwOnError: true });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: usersKeys.employees() });
    },
  });
}

export function usePromoteUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      jiraUserId,
      payload,
    }: {
      jiraUserId: number;
      payload?: { email_override?: string; full_name_override?: string };
    }) => {
      const res = await promoteToSystemUserApiV1UsersPromoteJiraUserIdPost({
        throwOnError: true,
        path: { jira_user_id: jiraUserId },
        body: payload as any,
      });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: usersKeys.employees() });
      queryClient.invalidateQueries({ queryKey: usersKeys.all() });
    },
  });
}
