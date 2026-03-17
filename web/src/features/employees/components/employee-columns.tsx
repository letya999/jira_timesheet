import { ColumnDef } from '@tanstack/react-table';
import type { OrgUnitResponse, UserType, UserResponse, JiraUserResponse } from '@/api/generated/types.gen';
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
  t: (key: string, options?: any) => string;
}

export const getEmployeeColumns = ({
  orgUnits,
  onEdit,
  onResetPassword,
  onMerge,
  onDelete,
  isAdmin,
  t,
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
        aria-label={t('select_all', 'Select all')}
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        checked={row.getIsSelected()}
        onCheckedChange={(value) => row.toggleSelected(!!value)}
        aria-label={t('select_row', 'Select row')}
      />
    ),
    enableSorting: false,
    enableHiding: false,
  },
  {
    accessorKey: 'display_name',
    header: t('columns.employee', 'Employee'),
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
            <span className="text-xs text-muted-foreground">{user.email || t('columns.no_email', 'No email')}</span>
          </div>
        </div>
      );
    },
  },
  {
    accessorKey: 'type',
    header: t('columns.type', 'Type'),
    cell: ({ row }) => {
      const type = row.original.type;
      return (
        <Badge variant={type === 'system' ? 'default' : 'secondary'} className="capitalize">
          {t(type, type)}
        </Badge>
      );
    },
  },
  {
    accessorKey: 'org_unit_id',
    header: t('columns.org_unit', 'Org Unit'),
    cell: ({ row }) => {
      const user = row.original;
      const unitIds = ((user as any).org_unit_ids as number[] | undefined) ?? [];
      const fallbackId = (user as any).org_unit_id as number | null | undefined;
      const effectiveUnitIds = unitIds.length > 0 ? unitIds : (fallbackId ? [fallbackId] : []);
      const unitNames = effectiveUnitIds
        .map((id) => orgUnits.find((u) => u.id === id)?.name)
        .filter(Boolean) as string[];

      if (unitNames.length > 1) {
         return <span className="text-xs font-medium">{t('columns.units_count', `${unitNames.length} Units`)}</span>;
      }

      return <span className="text-sm">{unitNames[0] || t('columns.unassigned', 'Unassigned')}</span>;
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
                <><Edit className="mr-2 h-4 w-4" /> {t('edit_user')}</>
              ) : (
                <><UserPlus className="mr-2 h-4 w-4" /> {t('promote_to_system')}</>
              )}
            </DropdownMenuItem>
            
            {isSystem && (
              <DropdownMenuItem onClick={() => onResetPassword(user.id)}>
                <Key className="mr-2 h-4 w-4" /> {t('reset_password')}
              </DropdownMenuItem>
            )}

            {!isSystem && (
              <DropdownMenuItem onClick={() => onMerge(user)}>
                <GitMerge className="mr-2 h-4 w-4" /> {t('merge_with_system')}
              </DropdownMenuItem>
            )}

            <DropdownMenuSeparator />
            <DropdownMenuItem 
              className="text-destructive focus:text-destructive"
              onClick={() => onDelete(user.id)}
            >
              <Trash className="mr-2 h-4 w-4" /> {t('delete')}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      );
    },
  },
];
