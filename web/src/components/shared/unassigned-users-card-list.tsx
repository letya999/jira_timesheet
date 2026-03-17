import * as React from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import { CardList } from "@/components/shared/card-list";
import type { UserResponse, JiraUserResponse } from "@/api/generated/types.gen";
import { useTranslation } from "react-i18next";

type HierarchyUser = (UserResponse | JiraUserResponse) & {
  type?: "system" | "import";
  org_unit_ids?: number[];
  avatar_url?: string | null;
};

interface UnassignedUsersCardListProps {
  users: HierarchyUser[];
  className?: string;
}

function getUserName(user: HierarchyUser): string {
  return user.full_name || user.display_name || user.email || `User #${user.id}`;
}

export function UnassignedUsersCardList({ users, className }: UnassignedUsersCardListProps) {
  const { t } = useTranslation();

  const unassignedUsers = React.useMemo(() => {
    return users.filter((user) => {
      const orgUnitIds = user.org_unit_ids?.length
        ? user.org_unit_ids
        : user.org_unit_id
          ? [user.org_unit_id]
          : [];
      return orgUnitIds.length === 0;
    });
  }, [users]);

  return (
    <CardList
      items={unassignedUsers}
      className={className}
      showPagination={false}
      emptyMessage={t("employees.no_unassigned", "No unassigned employees")}
      renderItem={(user) => (
        <Card key={`${user.type ?? "system"}:${user.id}`}>
          <CardContent className="flex items-center gap-3 p-3">
            <Avatar className="h-7 w-7">
              <AvatarImage src={user.avatar_url || ""} alt={getUserName(user)} />
              <AvatarFallback className="text-[10px]">{getUserName(user).charAt(0)}</AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{getUserName(user)}</p>
              <p className="truncate text-xs text-muted-foreground">{user.email}</p>
            </div>
          </CardContent>
        </Card>
      )}
    />
  );
}
