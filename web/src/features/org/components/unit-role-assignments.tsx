import * as React from 'react';
import { useUnitRoles, useAssignUnitRole, useRemoveUnitRole, useRoles } from '@/features/org/hooks';
import { useUsers } from '@/features/users/hooks';
import { OrgUnitResponse, RoleResponse, UnitRoleAssignment } from '@/features/org/schemas';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Trash2, Plus, Loader2 } from 'lucide-react';
import { toast } from '@/lib/toast';
import { useTranslation } from 'react-i18next';

interface UnitRoleAssignmentsProps {
  units: OrgUnitResponse[];
}

type UserItem = {
  id: number;
  display_name?: string;
  full_name?: string;
  email?: string;
};

type UsersPayload = {
  items?: UserItem[];
};

export function UnitRoleAssignments({ units }: UnitRoleAssignmentsProps) {
  const { t } = useTranslation();
  const [selectedUnitId, setSelectedUnitId] = React.useState<number | null>(null);
  const [selectedUserId, setSelectedUserId] = React.useState<number | null>(null);
  const [selectedRoleId, setSelectedRoleId] = React.useState<number | null>(null);

  const { data: assignments = [], isLoading: assignmentsLoading } = useUnitRoles(selectedUnitId || 0);
  const { data: usersData = { items: [] } } = useUsers();
  const { data: roles = [] } = useRoles();

  const assignMutation = useAssignUnitRole();
  const removeMutation = useRemoveUnitRole();

  const handleAssign = () => {
    if (!selectedUnitId || !selectedUserId || !selectedRoleId) return;
    assignMutation.mutate(
      { unit_id: selectedUnitId, user_id: selectedUserId, role_id: selectedRoleId },
      {
        onSuccess: () => {
          setSelectedUserId(null);
          setSelectedRoleId(null);
          toast.success(t('web.org.role_assigned'));
        },
        onError: () => toast.error(t('web.org.role_assign_failed')),
      }
    );
  };

  const handleRemove = (assignmentId: number) => {
    if (!selectedUnitId) return;
    removeMutation.mutate(
      { assignmentId, unitId: selectedUnitId },
      {
        onSuccess: () => toast.success(t('web.org.assignment_removed')),
        onError: () => toast.error(t('web.org.assignment_remove_failed')),
      }
    );
  };

  const users = (Array.isArray(usersData) ? usersData : (usersData as UsersPayload | undefined)?.items ?? []) as UserItem[];
  const assignmentItems = assignments as UnitRoleAssignment[];
  const roleItems = roles as RoleResponse[];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <h3 className="text-lg font-medium">{t('org.assign_roles_title')}</h3>
        <p className="text-sm text-muted-foreground">{t('web.org.assign_roles_subtitle')}</p>
      </div>

      <div className="space-y-2 max-w-sm">
        <Label htmlFor="unit-select">{t('org.select_unit_assign')}</Label>
        <Select
          value={selectedUnitId?.toString() || ''}
          onValueChange={(val) => setSelectedUnitId(Number(val))}
        >
          <SelectTrigger id="unit-select">
            <SelectValue placeholder={t('org.select_unit')} />
          </SelectTrigger>
          <SelectContent>
            {units.map((unit) => (
              <SelectItem key={unit.id} value={unit.id.toString()}>
                {unit.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {selectedUnitId && (
        <div className="space-y-4 border rounded-md p-4 bg-muted/30">
          <h4 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground">
            {t('web.org.assignments_for', { unit: units.find((u) => u.id === selectedUnitId)?.name })}
          </h4>

          {assignmentsLoading ? (
            <div className="flex items-center gap-2 py-4">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="text-sm">{t('web.org.loading_assignments')}</span>
            </div>
          ) : (
            <div className="space-y-2">
              {assignments.length === 0 ? (
                <p className="text-sm text-muted-foreground italic">{t('org.no_roles_assigned')}</p>
              ) : (
                assignmentItems.map((assignment) => {
                   const user = users.find((u) => u.id === assignment.user_id);
                   const role = roleItems.find((r) => r.id === assignment.role_id);
                   return (
                      <div
                        key={assignment.id}
                        className="flex items-center justify-between p-2 border rounded-md bg-background"
                      >
                        <div className="flex flex-col">
                          <span className="text-sm font-medium">{user?.display_name || user?.full_name || t('web.org.user_id', { id: assignment.user_id })}</span>
                          <span className="text-xs text-muted-foreground">{role?.name || t('web.org.role_id', { id: assignment.role_id })}</span>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          className="text-destructive hover:text-destructive hover:bg-destructive/10"
                          onClick={() => handleRemove(assignment.id)}
                          disabled={removeMutation.isPending}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                   )
                })
              )}
            </div>
          )}

          <div className="pt-4 border-t space-y-4">
            <h5 className="text-sm font-medium">{t('org.assign_new_role')}</h5>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="user-select" className="text-xs">{t('common.user')}</Label>
                <Select
                  value={selectedUserId?.toString() || ''}
                  onValueChange={(val) => setSelectedUserId(Number(val))}
                >
                  <SelectTrigger id="user-select">
                    <SelectValue placeholder={t('web.org.select_user')} />
                  </SelectTrigger>
                  <SelectContent>
                    {users.map((u) => (
                      <SelectItem key={u.id} value={u.id.toString()}>
                        {u.display_name || u.full_name || u.email}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="role-select" className="text-xs">{t('common.role')}</Label>
                <Select
                  value={selectedRoleId?.toString() || ''}
                  onValueChange={(val) => setSelectedRoleId(Number(val))}
                >
                  <SelectTrigger id="role-select">
                    <SelectValue placeholder={t('web.org.select_role')} />
                  </SelectTrigger>
                  <SelectContent>
                    {roleItems.map((r) => (
                      <SelectItem key={r.id} value={r.id.toString()}>
                        {r.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Button
              className="w-full"
              onClick={handleAssign}
              disabled={!selectedUserId || !selectedRoleId || assignMutation.isPending}
            >
              <Plus className="h-4 w-4 mr-2" />
              {t('web.org.assign_role')}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
