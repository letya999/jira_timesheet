import { ColumnDef } from '@tanstack/react-table';
import { OrgUnitResponse, UserType, UserResponse, JiraUserResponse } from '@/api/generated/types.gen';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { MoreHorizontal, Edit, Key, GitMerge, Trash, UserPlus } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';

export type UnifiedUser = (UserResponse | JiraUserResponse) & { type: UserType };

interface EmployeeColumnsProps {
  orgUnits: OrgUnitResponse[];
  onEdit: (user: UnifiedUser) => void;
  onResetPassword: (id: number) => void;
  onMerge: (user: UnifiedUser) => void;
  onDelete: (id: number) => void;
  isAdmin: boolean;
}

export const getEmployeeColumns = ({
  orgUnits,
  onEdit,
  onResetPassword,
  onMerge,
  onDelete,
  isAdmin,
}: EmployeeColumnsProps): ColumnDef<UnifiedUser>[] => [
  {
    id: 'select',
    header: ({ table }) => (
      <Checkbox
        checked={
          table.getIsAllPageRowsSelected() ||
          (table.getIsSomePageRowsSelected() && 'indeterminate')
        }
        onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
        aria-label="Select all"
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        checked={row.getIsSelected()}
        onCheckedChange={(value) => row.toggleSelected(!!value)}
        aria-label="Select row"
      />
    ),
    enableSorting: false,
    enableHiding: false,
  },
  {
    accessorKey: 'display_name',
    header: 'Employee',
    cell: ({ row }) => {
      const user = row.original;
      const name = (user as any).full_name || (user as any).display_name;
      const avatarUrl = (user as any).avatar_url || '';
      return (
        <div className="flex items-center gap-2">
          <Avatar className="h-8 w-8">
            <AvatarImage src={avatarUrl} alt={name} />
            <AvatarFallback>{name?.charAt(0)}</AvatarFallback>
          </Avatar>
          <div className="flex flex-col">
            <span className="font-medium">{name}</span>
            <span className="text-xs text-muted-foreground">{user.email || 'No email'}</span>
          </div>
        </div>
      );
    },
  },
  {
    accessorKey: 'type',
    header: 'Type',
    cell: ({ row }) => {
      const type = row.original.type;
      return (
        <Badge variant={type === 'system' ? 'default' : 'secondary'} className="capitalize">
          {type}
        </Badge>
      );
    },
  },
  {
    accessorKey: 'org_unit_id',
    header: 'Org Unit',
    cell: ({ row }) => {
      const user = row.original;
      const unit = orgUnits.find(u => u.id === (user as any).org_unit_id);
      const units = (user as any).org_unit_ids || [];
      
      if (units.length > 1) {
         return <span className="text-xs font-medium">{units.length} Units</span>;
      }
      
      return <span className="text-sm">{unit?.name || 'Unassigned'}</span>;
    },
  },
  {
    id: 'actions',
    cell: ({ row }) => {
      const user = row.original;
      const isSystem = user.type === 'system';

      if (!isAdmin) return null;

      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 w-8 p-0">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onEdit(user)}>
              {isSystem ? (
                <><Edit className="mr-2 h-4 w-4" /> Edit User</>
              ) : (
                <><UserPlus className="mr-2 h-4 w-4" /> Promote to System</>
              )}
            </DropdownMenuItem>
            
            {isSystem && (
              <DropdownMenuItem onClick={() => onResetPassword(user.id)}>
                <Key className="mr-2 h-4 w-4" /> Reset Password
              </DropdownMenuItem>
            )}

            {!isSystem && (
              <DropdownMenuItem onClick={() => onMerge(user)}>
                <GitMerge className="mr-2 h-4 w-4" /> Merge with System
              </DropdownMenuItem>
            )}

            <DropdownMenuSeparator />
            <DropdownMenuItem 
              className="text-destructive focus:text-destructive"
              onClick={() => onDelete(user.id)}
            >
              <Trash className="mr-2 h-4 w-4" /> Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      );
    },
  },
];
