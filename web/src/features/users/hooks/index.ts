import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  getUsersApiV1UsersGet,
  updateUserApiV1UsersUserIdPatch,
  getEmployeesApiV1OrgEmployeesGet,
} from '../../../api/generated/sdk.gen';

export const usersKeys = {
  all: () => ['users'] as const,
  list: (params?: object) => ['users', 'list', params] as const,
  detail: (id: number) => ['users', 'detail', id] as const,
  workload: (id: number) => ['users', 'workload', id] as const,
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
      const employees = Array.isArray(res.data) ? res.data : [];
      return employees.find((e: { id: number }) => e.id === userId) ?? null;
    },
    enabled: userId > 0,
  });
}
