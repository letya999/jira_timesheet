import { ColumnDef } from '@tanstack/react-table';
import { JiraUserResponse } from '@/features/users/schemas';
import { OrgUnitResponse } from '@/features/org/schemas';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

interface EmployeeColumnsProps {
  orgUnits: OrgUnitResponse[];
  onUpdate: (id: number, data: { org_unit_id?: number | null; is_active?: boolean }) => void;
  onPromote: (id: number) => void;
  isAdmin: boolean;
}

export const getEmployeeColumns = ({
  orgUnits,
  onUpdate,
  onPromote,
  isAdmin,
}: EmployeeColumnsProps): ColumnDef<JiraUserResponse>[] => [
  {
    accessorKey: 'display_name',
    header: 'Employee',
    cell: ({ row }) => {
      const user = row.original;
      return (
        <div className="flex items-center gap-2">
          <Avatar className="h-8 w-8">
            <AvatarImage src={user.avatar_url || ''} alt={user.display_name} />
            <AvatarFallback>{user.display_name.charAt(0)}</AvatarFallback>
          </Avatar>
          <div className="flex flex-col">
            <span className="font-medium">{user.display_name}</span>
            <span className="text-xs text-muted-foreground">{user.email}</span>
          </div>
        </div>
      );
    },
  },
  {
    accessorKey: 'org_unit_id',
    header: 'Org Unit',
    cell: ({ row }) => {
      const user = row.original;
      return (
        <Select
          value={user.org_unit_id?.toString() || 'unassigned'}
          onValueChange={(val) =>
            onUpdate(user.id, { org_unit_id: val === 'unassigned' ? null : Number(val) })
          }
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Unassigned" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="unassigned">Unassigned</SelectItem>
            {orgUnits.map((unit) => (
              <SelectItem key={unit.id} value={unit.id.toString()}>
                {unit.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      );
    },
  },
  {
    accessorKey: 'is_active',
    header: 'Active',
    cell: ({ row }) => {
      const user = row.original;
      return (
        <Switch
          checked={user.is_active}
          onCheckedChange={(checked) => onUpdate(user.id, { is_active: checked })}
        />
      );
    },
  },
  {
    accessorKey: 'user_id',
    header: 'System Access',
    cell: ({ row }) => {
      const hasAccess = !!row.original.user_id;
      return (
        <Badge variant={hasAccess ? 'default' : 'secondary'}>
          {hasAccess ? 'Access Granted' : 'No Access'}
        </Badge>
      );
    },
  },
  ...(isAdmin
    ? [
        {
          id: 'create_account',
          header: 'Create Account',
          cell: ({ row }: { row: { original: JiraUserResponse } }) => {
            const user = row.original;
            if (user.user_id) return null;
            return (
              <div className="flex items-center space-x-2">
                <Checkbox
                  id={`promote-${user.id}`}
                  onCheckedChange={(checked) => {
                    if (checked) onPromote(user.id);
                  }}
                />
                <label
                  htmlFor={`promote-${user.id}`}
                  className="text-xs font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  Create
                </label>
              </div>
            );
          },
        } as ColumnDef<JiraUserResponse>,
      ]
    : []),
];
