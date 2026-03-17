import * as React from "react";
import { ChevronDown, ChevronRight, Shield } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { OrgUnitResponse, UserResponse, JiraUserResponse } from "@/api/generated/types.gen";
import { cn } from "@/lib/utils";
import { useOrgUnitRoleAssignments } from "@/features/org/hooks/use-org-unit-role-assignments";
import { useTranslation } from "react-i18next";
import { isAdminRole, isLeadershipRoleLabel } from "@/lib/rbac";

type HierarchyUser = (UserResponse | JiraUserResponse) & {
  type?: "system" | "import";
  role?: string;
  org_unit_ids?: number[];
  avatar_url?: string | null;
};

interface OrgHierarchyWithMembersProps {
  units: OrgUnitResponse[];
  users: HierarchyUser[];
  className?: string;
}

type UnitUserView = {
  user: HierarchyUser;
  roleNames: string[];
};

function getUserName(user: HierarchyUser): string {
  return user.full_name || user.display_name || user.email || `User #${user.id}`;
}

export function OrgHierarchyWithMembers({
  units,
  users,
  className,
}: OrgHierarchyWithMembersProps) {
  const { t } = useTranslation();
  const { rolesByUnit } = useOrgUnitRoleAssignments(units);
  const rootUnits = React.useMemo(() => units.filter((u) => !u.parent_id), [units]);
  const [openUnits, setOpenUnits] = React.useState<Record<number, boolean>>({});

  React.useEffect(() => {
    if (Object.keys(openUnits).length === 0 && rootUnits.length > 0) {
      setOpenUnits(
        rootUnits.reduce<Record<number, boolean>>((acc, unit) => {
          acc[unit.id] = true;
          return acc;
        }, {})
      );
    }
  }, [rootUnits, openUnits]);

  const unitsByParent = React.useMemo(() => {
    return units.reduce<Record<number, OrgUnitResponse[]>>((acc, unit) => {
      const key = unit.parent_id ?? 0;
      if (!acc[key]) acc[key] = [];
      acc[key].push(unit);
      return acc;
    }, {});
  }, [units]);

  const usersByUnit = React.useMemo(() => {
    const byUnit: Record<number, HierarchyUser[]> = {};

    for (const user of users) {
      if (user.type === "system" && isAdminRole(user.role)) {
        continue;
      }

      const orgUnitIds = user.org_unit_ids?.length
        ? user.org_unit_ids
        : user.org_unit_id
          ? [user.org_unit_id]
          : [];

      if (orgUnitIds.length === 0) {
        continue;
      }

      for (const unitId of orgUnitIds) {
        if (!byUnit[unitId]) byUnit[unitId] = [];
        byUnit[unitId].push(user);
      }
    }

    return { byUnit };
  }, [users]);

  const getUnitUsers = React.useCallback(
    (unitId: number) => {
      const unitUsers = usersByUnit.byUnit[unitId] ?? [];
      const assignments = rolesByUnit[unitId] ?? [];
      const rolesByUser = assignments.reduce<Record<number, string[]>>((acc, assignment) => {
        const roleName = assignment.role?.name;
        if (!roleName) return acc;
        if (!acc[assignment.user_id]) acc[assignment.user_id] = [];
        acc[assignment.user_id].push(roleName);
        return acc;
      }, {});

      const leaders: UnitUserView[] = [];
      const members: UnitUserView[] = [];

      for (const user of unitUsers) {
        const assignedRoles = new Set(rolesByUser[user.id] ?? []);
        if (!assignedRoles.size && user.type === "system" && user.role && isLeadershipRoleLabel(user.role)) {
          assignedRoles.add(user.role);
        }
        const roleNames = Array.from(assignedRoles).filter((roleName) => isLeadershipRoleLabel(roleName));

        if (roleNames.length > 0) {
          leaders.push({ user, roleNames });
        } else {
          members.push({ user, roleNames: [] });
        }
      }

      return { leaders, members };
    },
    [rolesByUnit, usersByUnit.byUnit]
  );

  const toggleUnit = (unitId: number) => {
    setOpenUnits((prev) => ({ ...prev, [unitId]: !prev[unitId] }));
  };

  const renderUsers = (items: UnitUserView[]) => {
    return (
      <div className="flex flex-col gap-2">
        {items.map(({ user, roleNames }) => (
          <div
            key={`${user.type ?? "system"}:${user.id}`}
            className={cn(
              "flex items-center gap-2 rounded-md border px-2 py-1.5",
              roleNames.length > 0 ? "bg-primary/5 border-primary/20" : "bg-background"
            )}
          >
            <Avatar className="h-6 w-6">
              <AvatarImage src={user.avatar_url || ""} alt={getUserName(user)} />
              <AvatarFallback className="text-[10px]">{getUserName(user).charAt(0)}</AvatarFallback>
            </Avatar>
            <div className="flex min-w-0 flex-1 items-center gap-2">
              <span className="truncate text-sm">{getUserName(user)}</span>
              {roleNames.length > 0 ? (
                <div className="flex flex-wrap gap-1">
                  {roleNames.map((roleName) => (
                    <Badge key={`${user.id}-${roleName}`} variant="secondary" className="text-[10px]">
                      {roleName}
                    </Badge>
                  ))}
                </div>
              ) : null}
            </div>
          </div>
        ))}
      </div>
    );
  };

  const renderUnit = (unit: OrgUnitResponse, level: number): React.ReactNode => {
    const children = unitsByParent[unit.id] ?? [];
    const { leaders, members } = getUnitUsers(unit.id);
    const isOpen = openUnits[unit.id] ?? false;
    const hasChildren = children.length > 0;
    const hasContent = leaders.length > 0 || members.length > 0;

    return (
      <div key={unit.id} className="flex flex-col gap-2">
        <div className="flex items-center gap-2 rounded-md border bg-card px-3 py-2" style={{ marginLeft: level * 12 }}>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            className="h-5 w-5 p-0"
            onClick={() => toggleUnit(unit.id)}
            aria-label={isOpen ? "Collapse unit" : "Expand unit"}
          >
            {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </Button>
          <span className="text-sm font-semibold">{unit.name}</span>
          <Badge variant="outline" className="ml-auto text-[10px]">
            {unit.reporting_period || t("org.period_weekly", "Weekly")}
          </Badge>
        </div>

        {isOpen ? (
          <div className="flex flex-col gap-2" style={{ marginLeft: level * 12 + 30 }}>
            {leaders.length > 0 ? (
              <div className="rounded-md border border-primary/20 bg-primary/5 p-2">
                <div className="mb-2 flex items-center gap-2 text-xs font-semibold text-primary">
                  <Shield className="h-3.5 w-3.5" />
                  {t("employees.leaders", "Leadership")}
                </div>
                {renderUsers(leaders)}
              </div>
            ) : null}
            {members.length > 0 ? (
              <div className="rounded-md border bg-muted/10 p-2">
                <div className="mb-2 text-xs font-semibold text-muted-foreground">
                  {t("employees.members", "Members")}
                </div>
                {renderUsers(members)}
              </div>
            ) : null}
            {!hasContent && !hasChildren ? (
              <div className="text-xs italic text-muted-foreground">{t("employees.no_employees", "No employees found")}</div>
            ) : null}
            {children.map((child) => renderUnit(child, level + 1))}
          </div>
        ) : null}
      </div>
    );
  };

  return (
    <div className={cn("space-y-4", className)}>
      <div className="space-y-2">
        {rootUnits.length > 0 ? (
          rootUnits.map((unit) => renderUnit(unit, 0))
        ) : (
          <p className="text-sm text-muted-foreground">{t("org.no_units", "No organizational units found.")}</p>
        )}
      </div>
    </div>
  );
}
