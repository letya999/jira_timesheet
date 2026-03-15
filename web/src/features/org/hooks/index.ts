import { useQuery } from '@tanstack/react-query';
import {
  getOrgUnitsApiV1OrgUnitsGet,
  getEmployeesApiV1OrgEmployeesGet,
} from '../../../api/generated/sdk.gen';

export const orgKeys = {
  tree: () => ['org', 'tree'] as const,
  departments: (params?: object) => ['org', 'departments', params] as const,
  department: (id: number) => ['org', 'departments', id] as const,
};

export function useOrgTree() {
  return useQuery({
    queryKey: orgKeys.tree(),
    queryFn: async () => {
      const res = await getOrgUnitsApiV1OrgUnitsGet({ throwOnError: true });
      return res.data;
    },
  });
}

export function useDepartments(params?: { parent_id?: number; type?: string }) {
  return useQuery({
    queryKey: orgKeys.departments(params),
    queryFn: async () => {
      const res = await getOrgUnitsApiV1OrgUnitsGet({ throwOnError: true, query: params });
      return res.data;
    },
  });
}

export function useDepartment(id: number) {
  return useQuery({
    queryKey: orgKeys.department(id),
    queryFn: async () => {
      const res = await getOrgUnitsApiV1OrgUnitsGet({ throwOnError: true });
      const units = Array.isArray(res.data) ? res.data : [];
      return units.find((u: { id: number }) => u.id === id) ?? null;
    },
    enabled: id > 0,
  });
}

export function useEmployees(params?: { skip?: number; limit?: number }) {
  return useQuery({
    queryKey: ['org', 'employees', params],
    queryFn: async () => {
      const res = await getEmployeesApiV1OrgEmployeesGet({ throwOnError: true, query: params });
      return res.data;
    },
  });
}
