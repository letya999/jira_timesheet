import * as React from 'react';
import { useUnitRoles, useAssignUnitRole, useRemoveUnitRole, useRoles } from '@/features/org/hooks';
import { useUsers } from '@/features/users/hooks';
import { OrgUnitResponse } from '@/features/org/schemas';
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

interface UnitRoleAssignmentsProps {
  units: OrgUnitResponse[];
}

export function UnitRoleAssignments({ units }: UnitRoleAssignmentsProps) {
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
          toast.success('Role assigned');
        },
        onError: () => toast.error('Failed to assign role'),
      }
    );
  };

  const handleRemove = (assignmentId: number) => {
    if (!selectedUnitId) return;
    removeMutation.mutate(
      { assignmentId, unitId: selectedUnitId },
      {
        onSuccess: () => toast.success('Assignment removed'),
        onError: () => toast.error('Failed to remove assignment'),
      }
    );
  };

  const users = Array.isArray(usersData) ? usersData : (usersData as any)?.items || [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <h3 className="text-lg font-medium">Unit Role Assignments</h3>
        <p className="text-sm text-muted-foreground">Assign roles to users within specific organizational units.</p>
      </div>

      <div className="space-y-2 max-w-sm">
        <Label htmlFor="unit-select">Select Organizational Unit</Label>
        <Select
          value={selectedUnitId?.toString() || ''}
          onValueChange={(val) => setSelectedUnitId(Number(val))}
        >
          <SelectTrigger id="unit-select">
            <SelectValue placeholder="Select a unit..." />
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
            Assignments for {units.find((u) => u.id === selectedUnitId)?.name}
          </h4>

          {assignmentsLoading ? (
            <div className="flex items-center gap-2 py-4">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="text-sm">Loading assignments...</span>
            </div>
          ) : (
            <div className="space-y-2">
              {assignments.length === 0 ? (
                <p className="text-sm text-muted-foreground italic">No assignments found for this unit.</p>
              ) : (
                assignments.map((assignment: any) => {
                   const user = users.find((u: any) => u.id === assignment.user_id);
                   const role = roles.find((r: any) => r.id === assignment.role_id);
                   return (
                      <div
                        key={assignment.id}
                        className="flex items-center justify-between p-2 border rounded-md bg-background"
                      >
                        <div className="flex flex-col">
                          <span className="text-sm font-medium">{user?.display_name || user?.full_name || `User ID: ${assignment.user_id}`}</span>
                          <span className="text-xs text-muted-foreground">{role?.name || `Role ID: ${assignment.role_id}`}</span>
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
            <h5 className="text-sm font-medium">Add New Assignment</h5>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="user-select" className="text-xs">User</Label>
                <Select
                  value={selectedUserId?.toString() || ''}
                  onValueChange={(val) => setSelectedUserId(Number(val))}
                >
                  <SelectTrigger id="user-select">
                    <SelectValue placeholder="Select user..." />
                  </SelectTrigger>
                  <SelectContent>
                    {users.map((u: any) => (
                      <SelectItem key={u.id} value={u.id.toString()}>
                        {u.display_name || u.full_name || u.email}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="role-select" className="text-xs">Role</Label>
                <Select
                  value={selectedRoleId?.toString() || ''}
                  onValueChange={(val) => setSelectedRoleId(Number(val))}
                >
                  <SelectTrigger id="role-select">
                    <SelectValue placeholder="Select role..." />
                  </SelectTrigger>
                  <SelectContent>
                    {roles.map((r: any) => (
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
              Assign Role
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
