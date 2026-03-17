import { useMemo } from "react";
import { useQueries } from "@tanstack/react-query";
import { getUnitRolesApiV1OrgUnitsUnitIdRolesGet } from "@/api/generated/sdk.gen";
import type { OrgUnitResponse, UserOrgRoleResponse } from "@/api/generated/types.gen";

export function useOrgUnitRoleAssignments(units: OrgUnitResponse[]) {
  const unitIds = useMemo(() => units.map((u) => u.id), [units]);

  const queries = useQueries({
    queries: unitIds.map((unitId) => ({
      queryKey: ["org", "units", unitId, "roles"],
      queryFn: async () => {
        const res = await getUnitRolesApiV1OrgUnitsUnitIdRolesGet({
          throwOnError: true,
          path: { unit_id: unitId },
        });
        return (res.data ?? []) as UserOrgRoleResponse[];
      },
      enabled: unitIds.length > 0,
    })),
  });

  const rolesByUnit = useMemo(() => {
    const result: Record<number, UserOrgRoleResponse[]> = {};
    unitIds.forEach((unitId, index) => {
      result[unitId] = (queries[index]?.data ?? []) as UserOrgRoleResponse[];
    });
    return result;
  }, [queries, unitIds]);

  const isLoading = queries.some((query) => query.isLoading);

  return { rolesByUnit, isLoading };
}
