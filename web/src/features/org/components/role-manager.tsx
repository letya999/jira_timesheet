import * as React from 'react';
import { useRoles, useCreateRole, useDeleteRole } from '@/features/org/hooks';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Trash2, Plus } from 'lucide-react';
import { toast } from '@/lib/toast';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

export function RoleManager() {
  const [newRoleName, setNewRoleName] = React.useState('');
  const { data: roles = [], isLoading } = useRoles();
  const createMutation = useCreateRole();
  const deleteMutation = useDeleteRole();

  const handleCreate = () => {
    if (!newRoleName.trim()) return;
    createMutation.mutate({ name: newRoleName }, {
      onSuccess: () => {
        setNewRoleName('');
        toast.success('Role created');
      },
      onError: () => toast.error('Failed to create role'),
    });
  };

  const handleDelete = (id: number) => {
    deleteMutation.mutate(id, {
      onSuccess: () => toast.success('Role deleted'),
      onError: () => toast.error('Failed to delete role'),
    });
  };

  if (isLoading) return <div>Loading roles...</div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <h3 className="text-lg font-medium">Manage Roles</h3>
        <p className="text-sm text-muted-foreground">Define system and organizational roles.</p>
      </div>

      <div className="flex gap-2 max-w-sm">
        <Input
          placeholder="New role name..."
          value={newRoleName}
          onChange={(e) => setNewRoleName(e.target.value)}
        />
        <Button onClick={handleCreate} disabled={createMutation.isPending || !newRoleName.trim()}>
          <Plus className="h-4 w-4 mr-2" />
          Add Role
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        {roles.map((role) => (
          <div
            key={role.id}
            className="flex items-center justify-between p-3 border rounded-md bg-card"
          >
            <div className="flex items-center gap-2">
              <span className="font-medium text-sm">{role.name}</span>
              {role.is_system && (
                <Badge variant="outline" className="text-[10px] h-4 px-1">
                  System
                </Badge>
              )}
            </div>

            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    className="text-destructive hover:text-destructive hover:bg-destructive/10"
                    disabled={role.is_system || deleteMutation.isPending}
                    onClick={() => handleDelete(role.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                {role.is_system && (
                  <TooltipContent>
                    <p>System roles cannot be deleted</p>
                  </TooltipContent>
                )}
              </Tooltip>
            </TooltipProvider>
          </div>
        ))}
      </div>
    </div>
  );
}
