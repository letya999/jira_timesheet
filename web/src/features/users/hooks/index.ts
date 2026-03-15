import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  getUsersApiV1UsersGet,
  updateUserApiV1UsersUserIdPatch,
  getEmployeesApiV1OrgEmployeesGet,
  updateEmployeeApiV1OrgEmployeesEmployeeIdPatch,
  syncUsersApiV1UsersSyncPost,
  promoteToSystemUserApiV1UsersPromoteJiraUserIdPost,
} from '../../../api/generated/sdk.gen';

export const usersKeys = {
  all: () => ['users'] as const,
  list: (params?: object) => ['users', 'list', params] as const,
  detail: (id: number) => ['users', 'detail', id] as const,
  workload: (id: number) => ['users', 'workload', id] as const,
  employees: (params?: object) => ['users', 'employees', params] as const,
};

export function useUsers(params?: { skip?: number; limit?: number }) {
  return useQuery({
    queryKey: usersKeys.list(params),
    queryFn: async () => {
      const res = await getUsersApiV1UsersGet({ throwOnError: true, query: params });
      return res.data;
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
        query: params as Parameters<typeof getEmployeesApiV1OrgEmployeesGet>[0]['query']
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
    mutationFn: async (jiraUserId: number) => {
      const res = await promoteToSystemUserApiV1UsersPromoteJiraUserIdPost({
        throwOnError: true,
        path: { jira_user_id: jiraUserId },
      });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: usersKeys.employees() });
      queryClient.invalidateQueries({ queryKey: usersKeys.all() });
    },
  });
}
