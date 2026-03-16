import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { OrgUnitCreate } from '../schemas';
import {
  getOrgUnitsApiV1OrgUnitsGet,
  getEmployeesApiV1OrgEmployeesGet,
  createOrgUnitApiV1OrgUnitsPost,
  updateOrgUnitApiV1OrgUnitsUnitIdPatch,
  deleteOrgUnitApiV1OrgUnitsUnitIdDelete,
  getRolesApiV1OrgRolesGet,
  createRoleApiV1OrgRolesPost,
  deleteRoleApiV1OrgRolesRoleIdDelete,
  getUnitRolesApiV1OrgUnitsUnitIdRolesGet,
  assignUserRoleApiV1OrgUnitsRolesPost,
  removeUserRoleApiV1OrgUnitsRolesAssignmentIdDelete,
  getUnitApprovalRoutesApiV1OrgUnitsUnitIdApprovalRoutesGet,
  createApprovalRouteApiV1OrgUnitsApprovalRoutesPost,
  deleteApprovalRouteApiV1OrgUnitsApprovalRoutesRouteIdDelete,
} from '../../../api/generated/sdk.gen';

export const orgKeys = {
  tree: () => ['org', 'tree'] as const,
  departments: (params?: object) => ['org', 'departments', params] as const,
  department: (id: number) => ['org', 'departments', id] as const,
  roles: () => ['org', 'roles'] as const,
  unitRoles: (unitId: number) => ['org', 'units', unitId, 'roles'] as const,
  approvalRoutes: (unitId: number, targetType: string) => ['org', 'units', unitId, 'approval-routes', targetType] as const,
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

export function useDepartments() {
  return useQuery({
    queryKey: orgKeys.departments(),
    queryFn: async () => {
      const res = await getOrgUnitsApiV1OrgUnitsGet({ throwOnError: true });
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

export function useEmployees(params?: { page?: number; size?: number; search?: string; org_unit_id?: number }) {
  return useQuery({
    queryKey: ['org', 'employees', params],
    queryFn: async () => {
      const res = await getEmployeesApiV1OrgEmployeesGet({ throwOnError: true, query: params });
      return res.data;
    },
  });
}

export function useRoles() {
  return useQuery({
    queryKey: orgKeys.roles(),
    queryFn: async () => {
      const res = await getRolesApiV1OrgRolesGet({ throwOnError: true });
      return res.data;
    },
  });
}

export function useCreateRole() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: { name: string }) => {
      const res = await createRoleApiV1OrgRolesPost({ throwOnError: true, body: data });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: orgKeys.roles() });
    },
  });
}

export function useDeleteRole() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (roleId: number) => {
      await deleteRoleApiV1OrgRolesRoleIdDelete({ throwOnError: true, path: { role_id: roleId } });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: orgKeys.roles() });
    },
  });
}

export function useCreateOrgUnit() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: OrgUnitCreate) => {
      const res = await createOrgUnitApiV1OrgUnitsPost({ throwOnError: true, body: data });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: orgKeys.tree() });
    },
  });
}

export function useUpdateOrgUnit() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<OrgUnitCreate> }) => {
      const res = await updateOrgUnitApiV1OrgUnitsUnitIdPatch({
        throwOnError: true,
        path: { unit_id: id },
        body: data,
      });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: orgKeys.tree() });
    },
  });
}

export function useDeleteOrgUnit() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      await deleteOrgUnitApiV1OrgUnitsUnitIdDelete({ throwOnError: true, path: { unit_id: id } });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: orgKeys.tree() });
    },
  });
}

export function useUnitRoles(unitId: number) {
  return useQuery({
    queryKey: orgKeys.unitRoles(unitId),
    queryFn: async () => {
      const res = await getUnitRolesApiV1OrgUnitsUnitIdRolesGet({
        throwOnError: true,
        path: { unit_id: unitId },
      });
      return res.data;
    },
    enabled: !!unitId,
  });
}

export function useAssignUnitRole() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: { unit_id: number; user_id: number; role_id: number }) => {
      const res = await assignUserRoleApiV1OrgUnitsRolesPost({
        throwOnError: true,
        body: {
          org_unit_id: data.unit_id,
          user_id: data.user_id,
          role_id: data.role_id,
        },
      });
      return res.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: orgKeys.unitRoles(variables.unit_id) });
    },
  });
}

export function useRemoveUnitRole() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (vars: { assignmentId: number; unitId: number }) => {
      await removeUserRoleApiV1OrgUnitsRolesAssignmentIdDelete({
        throwOnError: true,
        path: { assignment_id: vars.assignmentId },
      });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: orgKeys.unitRoles(variables.unitId) });
    },
  });
}

export function useApprovalRoutes(unitId: number, targetType: 'leave' | 'timesheet') {
  return useQuery({
    queryKey: orgKeys.approvalRoutes(unitId, targetType),
    queryFn: async () => {
      const res = await getUnitApprovalRoutesApiV1OrgUnitsUnitIdApprovalRoutesGet({
        throwOnError: true,
        path: { unit_id: unitId },
        query: { target_type: targetType },
      });
      return res.data;
    },
    enabled: !!unitId && !!targetType,
  });
}

export function useCreateApprovalRoute() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: { unit_id: number; target_type: 'leave' | 'timesheet'; step_order: number; role_id: number }) => {
      const res = await createApprovalRouteApiV1OrgUnitsApprovalRoutesPost({
        throwOnError: true,
        body: {
          org_unit_id: data.unit_id,
          target_type: data.target_type,
          step_order: data.step_order,
          role_id: data.role_id,
        },
      });
      return res.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: orgKeys.approvalRoutes(variables.unit_id, variables.target_type) });
    },
  });
}

export function useDeleteApprovalRoute() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (vars: { routeId: number; unitId: number; targetType: 'leave' | 'timesheet' }) => {
      await deleteApprovalRouteApiV1OrgUnitsApprovalRoutesRouteIdDelete({
        throwOnError: true,
        path: { route_id: vars.routeId },
      });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: orgKeys.approvalRoutes(variables.unitId, variables.targetType) });
    },
  });
}
