import { vi, describe, it, expect, beforeEach } from 'vitest';
import { act, waitFor } from '@testing-library/react';
import { renderHookWithQuery } from '../../../test/render-with-providers';
import * as sdk from '../../../api/generated/sdk.gen';
import { 
  useOrgTree,
  useRoles,
  useCreateRole,
  useDeleteRole,
  useCreateOrgUnit,
  useUpdateOrgUnit,
  useDeleteOrgUnit,
  useUnitRoles,
  useAssignUnitRole,
  useRemoveUnitRole,
  useApprovalRoutes,
  useCreateApprovalRoute,
  useDeleteApprovalRoute,
  orgKeys
} from './index';

// Mock the SDK
vi.mock('../../../api/generated/sdk.gen', () => ({
  getOrgUnitsApiV1OrgUnitsGet: vi.fn(),
  getRolesApiV1OrgRolesGet: vi.fn(),
  createRoleApiV1OrgRolesPost: vi.fn(),
  deleteRoleApiV1OrgRolesRoleIdDelete: vi.fn(),
  createOrgUnitApiV1OrgUnitsPost: vi.fn(),
  updateOrgUnitApiV1OrgUnitsUnitIdPatch: vi.fn(),
  deleteOrgUnitApiV1OrgUnitsUnitIdDelete: vi.fn(),
  getUnitRolesApiV1OrgUnitsUnitIdRolesGet: vi.fn(),
  assignUserRoleApiV1OrgUnitsRolesPost: vi.fn(),
  removeUserRoleApiV1OrgUnitsRolesAssignmentIdDelete: vi.fn(),
  getUnitApprovalRoutesApiV1OrgUnitsUnitIdApprovalRoutesGet: vi.fn(),
  createApprovalRouteApiV1OrgUnitsApprovalRoutesPost: vi.fn(),
  deleteApprovalRouteApiV1OrgUnitsApprovalRoutesRouteIdDelete: vi.fn(),
  getEmployeesApiV1OrgEmployeesGet: vi.fn(),
}));

describe('org hooks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('useOrgTree calls getOrgUnitsApiV1OrgUnitsGet', async () => {
    const mockData = [{ id: 1, name: 'Root' }];
    vi.mocked(sdk.getOrgUnitsApiV1OrgUnitsGet).mockResolvedValue({ data: mockData } as any);
    const { result } = renderHookWithQuery(() => useOrgTree());
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(sdk.getOrgUnitsApiV1OrgUnitsGet).toHaveBeenCalledWith({ throwOnError: true });
    expect(result.current.data).toEqual(mockData);
  });

  it('useRoles calls getRolesApiV1OrgRolesGet', async () => {
    const mockData = [{ id: 1, name: 'Admin' }];
    vi.mocked(sdk.getRolesApiV1OrgRolesGet).mockResolvedValue({ data: mockData } as any);
    const { result } = renderHookWithQuery(() => useRoles());
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(sdk.getRolesApiV1OrgRolesGet).toHaveBeenCalledWith({ throwOnError: true });
  });

  it('useCreateRole calls createRoleApiV1OrgRolesPost and invalidates', async () => {
    vi.mocked(sdk.createRoleApiV1OrgRolesPost).mockResolvedValue({ data: {} } as any);
    const { result, queryClient } = renderHookWithQuery(() => useCreateRole());
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');
    await act(async () => {
      await result.current.mutateAsync({ name: 'Manager' });
    });
    expect(sdk.createRoleApiV1OrgRolesPost).toHaveBeenCalledWith({ throwOnError: true, body: { name: 'Manager' } });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: orgKeys.roles() });
  });

  it('useDeleteRole calls deleteRoleApiV1OrgRolesRoleIdDelete and invalidates', async () => {
    vi.mocked(sdk.deleteRoleApiV1OrgRolesRoleIdDelete).mockResolvedValue({ data: {} } as any);
    const { result, queryClient } = renderHookWithQuery(() => useDeleteRole());
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');
    await act(async () => {
      await result.current.mutateAsync(1);
    });
    expect(sdk.deleteRoleApiV1OrgRolesRoleIdDelete).toHaveBeenCalledWith({ throwOnError: true, path: { role_id: 1 } });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: orgKeys.roles() });
  });

  it('useCreateOrgUnit calls createOrgUnitApiV1OrgUnitsPost and invalidates', async () => {
    const data = { name: 'New Unit', parent_id: 1 };
    vi.mocked(sdk.createOrgUnitApiV1OrgUnitsPost).mockResolvedValue({ data: {} } as any);
    const { result, queryClient } = renderHookWithQuery(() => useCreateOrgUnit());
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');
    await act(async () => {
      await result.current.mutateAsync(data);
    });
    expect(sdk.createOrgUnitApiV1OrgUnitsPost).toHaveBeenCalledWith({ throwOnError: true, body: data });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: orgKeys.tree() });
  });

  it('useUpdateOrgUnit calls updateOrgUnitApiV1OrgUnitsUnitIdPatch and invalidates', async () => {
    const data = { name: 'Updated Name' };
    vi.mocked(sdk.updateOrgUnitApiV1OrgUnitsUnitIdPatch).mockResolvedValue({ data: {} } as any);
    const { result, queryClient } = renderHookWithQuery(() => useUpdateOrgUnit());
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');
    await act(async () => {
      await result.current.mutateAsync({ id: 1, data });
    });
    expect(sdk.updateOrgUnitApiV1OrgUnitsUnitIdPatch).toHaveBeenCalledWith({ throwOnError: true, path: { unit_id: 1 }, body: data });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: orgKeys.tree() });
  });

  it('useDeleteOrgUnit calls deleteOrgUnitApiV1OrgUnitsUnitIdDelete and invalidates', async () => {
    vi.mocked(sdk.deleteOrgUnitApiV1OrgUnitsUnitIdDelete).mockResolvedValue({ data: {} } as any);
    const { result, queryClient } = renderHookWithQuery(() => useDeleteOrgUnit());
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');
    await act(async () => {
      await result.current.mutateAsync(1);
    });
    expect(sdk.deleteOrgUnitApiV1OrgUnitsUnitIdDelete).toHaveBeenCalledWith({ throwOnError: true, path: { unit_id: 1 } });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: orgKeys.tree() });
  });

  it('useUnitRoles calls getUnitRolesApiV1OrgUnitsUnitIdRolesGet', async () => {
    vi.mocked(sdk.getUnitRolesApiV1OrgUnitsUnitIdRolesGet).mockResolvedValue({ data: [] } as any);
    const { result } = renderHookWithQuery(() => useUnitRoles(1));
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(sdk.getUnitRolesApiV1OrgUnitsUnitIdRolesGet).toHaveBeenCalledWith({ throwOnError: true, path: { unit_id: 1 } });
  });

  it('useAssignUnitRole calls assignUserRoleApiV1OrgUnitsRolesPost and invalidates', async () => {
    const data = { unit_id: 1, user_id: 2, role_id: 3 };
    vi.mocked(sdk.assignUserRoleApiV1OrgUnitsRolesPost).mockResolvedValue({ data: {} } as any);
    const { result, queryClient } = renderHookWithQuery(() => useAssignUnitRole());
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');
    await act(async () => {
      await result.current.mutateAsync(data);
    });
    expect(sdk.assignUserRoleApiV1OrgUnitsRolesPost).toHaveBeenCalledWith({ throwOnError: true, body: data });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: orgKeys.unitRoles(1) });
  });

  it('useRemoveUnitRole calls removeUserRoleApiV1OrgUnitsRolesAssignmentIdDelete and invalidates', async () => {
    vi.mocked(sdk.removeUserRoleApiV1OrgUnitsRolesAssignmentIdDelete).mockResolvedValue({ data: {} } as any);
    const { result, queryClient } = renderHookWithQuery(() => useRemoveUnitRole());
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');
    await act(async () => {
      await result.current.mutateAsync({ assignmentId: 10, unitId: 1 });
    });
    expect(sdk.removeUserRoleApiV1OrgUnitsRolesAssignmentIdDelete).toHaveBeenCalledWith({ throwOnError: true, path: { assignment_id: 10 } });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: orgKeys.unitRoles(1) });
  });

  it('useApprovalRoutes calls getUnitApprovalRoutesApiV1OrgUnitsUnitIdApprovalRoutesGet', async () => {
    vi.mocked(sdk.getUnitApprovalRoutesApiV1OrgUnitsUnitIdApprovalRoutesGet).mockResolvedValue({ data: [] } as any);
    const { result } = renderHookWithQuery(() => useApprovalRoutes(1, 'leave'));
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(sdk.getUnitApprovalRoutesApiV1OrgUnitsUnitIdApprovalRoutesGet).toHaveBeenCalledWith({
      throwOnError: true,
      path: { unit_id: 1 },
      query: { target_type: 'leave' }
    });
  });

  it('useCreateApprovalRoute calls createApprovalRouteApiV1OrgUnitsApprovalRoutesPost and invalidates', async () => {
    const data = { unit_id: 1, target_type: 'leave' as const, step_order: 1, role_id: 2 };
    vi.mocked(sdk.createApprovalRouteApiV1OrgUnitsApprovalRoutesPost).mockResolvedValue({ data: {} } as any);
    const { result, queryClient } = renderHookWithQuery(() => useCreateApprovalRoute());
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');
    await act(async () => {
      await result.current.mutateAsync(data);
    });
    expect(sdk.createApprovalRouteApiV1OrgUnitsApprovalRoutesPost).toHaveBeenCalledWith({ throwOnError: true, body: data });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: orgKeys.approvalRoutes(1, 'leave') });
  });

  it('useDeleteApprovalRoute calls deleteApprovalRouteApiV1OrgUnitsApprovalRoutesRouteIdDelete and invalidates', async () => {
    vi.mocked(sdk.deleteApprovalRouteApiV1OrgUnitsApprovalRoutesRouteIdDelete).mockResolvedValue({ data: {} } as any);
    const { result, queryClient } = renderHookWithQuery(() => useDeleteApprovalRoute());
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');
    await act(async () => {
      await result.current.mutateAsync({ routeId: 5, unitId: 1, targetType: 'leave' });
    });
    expect(sdk.deleteApprovalRouteApiV1OrgUnitsApprovalRoutesRouteIdDelete).toHaveBeenCalledWith({ throwOnError: true, path: { route_id: 5 } });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: orgKeys.approvalRoutes(1, 'leave') });
  });
});
