import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { 
  useUsers, 
  useResetPassword, 
  useSyncUsersFromJira, 
  useDeleteUser
} from '@/features/users/hooks';
import { useOrgTree } from '@/features/org/hooks';
import { useCurrentUser } from '@/features/auth/hooks';
import { getEmployeeColumns, UnifiedUser } from '../components/employee-columns';
import { ActionTable } from '@/components/shared/action-table';
import { OrgHierarchyWithMembers } from '@/components/shared/org-hierarchy-with-members';
import { UnassignedUsersCardList } from '@/components/shared/unassigned-users-card-list';
import { TempPasswordDialog } from '../components/temp-password-dialog';
import { UserEditDialog } from '../components/user-edit-dialog';
import { MergeUserDialog } from '../components/merge-user-dialog';
import { BulkActionDialog } from '../components/bulk-action-dialog';
import { EmployeeFilterPanel } from '../components/employee-filter-panel';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { 
  RefreshCw, 
  Users, 
  Settings2, 
  Trash2, 
  ArrowRight,
  UserPlus
} from 'lucide-react';
import { toast } from '@/lib/toast';
import { Skeleton } from '@/components/ui/skeleton';
import type { UserType, UserPromoteResponse, UserResponse, JiraUserResponse } from '@/api/generated/types.gen';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';

export function EmployeesPage() {
  const { t } = useTranslation('employees');
  const [filters, setFilters] = React.useState<{
    search?: string;
    type?: UserType;
    org_unit_id?: number;
  }>({});
  const [page, setPage] = React.useState(1);
  const [selectedRows, setSelectedRows] = React.useState<Record<string, boolean>>({});
  
  // Dialog states
  const [tempCredentials, setTempCredentials] = React.useState<UserPromoteResponse | null>(null);
  const [editingUser, setEditingUser] = React.useState<UnifiedUser | null>(null);
  const [mergingUser, setMergingUser] = React.useState<UnifiedUser | null>(null);
  const [bulkMode, setBulkMode] = React.useState<'role' | 'org_unit' | 'promote' | null>(null);

  const { data: currentUser } = useCurrentUser();
  const isAdmin = currentUser?.role === 'Admin';

  const { data: employeesData, isLoading: employeesLoading } = useUsers({
    page,
    size: 20,
    ...filters,
  });
  const { data: hierarchyData, isLoading: hierarchyLoading } = useUsers({
    page: 1,
    size: 500,
  });

  const { data: orgUnits = [], isLoading: orgLoading } = useOrgTree();

  const syncMutation = useSyncUsersFromJira();
  const resetPasswordMutation = useResetPassword();
  const deleteMutation = useDeleteUser();

  const handleResetPassword = React.useCallback((id: number) => {
    resetPasswordMutation.mutate(id, {
      onSuccess: (data) => {
        setTempCredentials(data);
        toast.success(t('messages.password_reset_success', 'Password reset successfully'));
      },
      onError: () => toast.error(t('messages.password_reset_failed', 'Failed to reset password')),
    });
  }, [resetPasswordMutation, t]);

  const handleDelete = React.useCallback((id: number) => {
    if (window.confirm(t('messages.confirm_delete', 'Are you sure you want to delete this user?'))) {
      deleteMutation.mutate(id, {
        onSuccess: () => toast.success(t('messages.user_deleted', 'User deleted')),
        onError: () => toast.error(t('messages.delete_failed', 'Failed to delete user')),
      });
    }
  }, [deleteMutation, t]);

  const selectedUserIds = React.useMemo(() => {
    const ids = Object.keys(selectedRows)
      .filter((rowId) => selectedRows[rowId])
      .map((rowId) => Number(rowId.split(':').at(-1)))
      .filter((id) => Number.isFinite(id));
    return Array.from(new Set(ids));
  }, [selectedRows]);

  const handleBulkDelete = React.useCallback(async () => {
    if (selectedUserIds.length === 0) return;
    if (window.confirm(t('messages.confirm_bulk_delete', { count: selectedUserIds.length }, `Delete ${selectedUserIds.length} selected users?`))) {
      try {
        for (const id of selectedUserIds) {
          await deleteMutation.mutateAsync(id);
        }
        toast.success(t('messages.bulk_delete_success', { count: selectedUserIds.length }, `Successfully deleted ${selectedUserIds.length} users`));
        setSelectedRows({});
      } catch (error) {
        toast.error(t('messages.bulk_delete_failed', 'Failed to delete some users'));
      }
    }
  }, [selectedUserIds, deleteMutation, t]);

  const columns = React.useMemo(
    () =>
      getEmployeeColumns({
        orgUnits: orgUnits as any,
        onEdit: (user) => setEditingUser(user),
        onResetPassword: handleResetPassword,
        onMerge: (user) => setMergingUser(user),
        onDelete: handleDelete,
        isAdmin,
        t,
      }),
    [orgUnits, isAdmin, handleResetPassword, handleDelete, t]
  );

  const employees = employeesData?.items || [];
  const total = employeesData?.total || 0;
  const hierarchyUsers = hierarchyData?.items || [];

  const selectedCount = selectedUserIds.length;

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t('title')}</h1>
          <p className="text-muted-foreground">{t('subtitle')}</p>
        </div>
        <div className="flex gap-2">
          {selectedCount > 0 && isAdmin && (
            <div className="flex items-center gap-2 mr-4 bg-muted p-1 px-3 rounded-lg border animate-in fade-in slide-in-from-right-4">
              <span className="text-sm font-medium">{selectedCount} {t('selected', 'selected')}</span>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="secondary" size="sm">
                    {t('bulk_actions')}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuItem onClick={() => setBulkMode('role')}>
                    <Settings2 className="mr-2 h-4 w-4" /> {t('set_role')}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setBulkMode('org_unit')}>
                    <ArrowRight className="mr-2 h-4 w-4" /> {t('set_org_unit')}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setBulkMode('promote')}>
                    <UserPlus className="mr-2 h-4 w-4" /> {t('promote_all')}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleBulkDelete} className="text-destructive">
                    <Trash2 className="mr-2 h-4 w-4" /> {t('delete_all')}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )}
          {isAdmin && (
            <Button onClick={() => syncMutation.mutate()} disabled={syncMutation.isPending} variant="outline">
              <RefreshCw className={`mr-2 h-4 w-4 ${syncMutation.isPending ? 'animate-spin' : ''}`} />
              {t('sync_jira', 'Sync from Jira')}
            </Button>
          )}
        </div>
      </div>

      <Tabs defaultValue="list" className="w-full">
        <TabsList>
          <TabsTrigger value="list" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            {t('list_view', 'List View')}
          </TabsTrigger>
          <TabsTrigger value="hierarchy" className="flex items-center gap-2">
            <Settings2 className="h-4 w-4" />
            {t('hierarchy_view', 'Hierarchy View')}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="list" className="space-y-4 pt-4">
          <EmployeeFilterPanel 
            orgUnits={orgUnits as any} 
            onFilterChange={(f) => {
              setFilters(f);
              setPage(1);
            }} 
          />

          {employeesLoading || orgLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-20 w-full" />
            </div>
          ) : (
            <ActionTable 
              columns={columns} 
              data={employees as UnifiedUser[]}
              getRowId={(row) => `${(row as UnifiedUser).type}:${(row as UnifiedUser).id}`}
              onRowSelectionChange={isAdmin ? setSelectedRows : undefined}
              rowSelection={isAdmin ? selectedRows : undefined}
              total={total}
              page={page}
              pageSize={20}
              onPageChange={setPage}
              itemLabel="employees"
            />
          )}
        </TabsContent>

        <TabsContent value="hierarchy" className="pt-4">
          {orgLoading || hierarchyLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : (
            <div className="space-y-4">
              <OrgHierarchyWithMembers units={orgUnits as any} users={hierarchyUsers as UnifiedUser[]} />
              <div className="space-y-2 border-t pt-4">
                <h3 className="text-sm font-semibold">{t('unassigned', 'Unassigned')}</h3>
                <UnassignedUsersCardList users={hierarchyUsers as UnifiedUser[]} />
              </div>
            </div>
          )}
        </TabsContent>
      </Tabs>

      <TempPasswordDialog
        credentials={tempCredentials}
        onClose={() => setTempCredentials(null)}
      />

      <UserEditDialog
        isOpen={!!editingUser}
        user={editingUser as UserResponse}
        orgUnits={orgUnits as any}
        onClose={() => setEditingUser(null)}
        onPromoteSuccess={(creds) => setTempCredentials(creds)}
      />

      <MergeUserDialog
        isOpen={!!mergingUser}
        importUser={mergingUser as JiraUserResponse}
        onClose={() => setMergingUser(null)}
      />

      <BulkActionDialog
        isOpen={!!bulkMode}
        mode={bulkMode}
        userIds={selectedUserIds}
        orgUnits={orgUnits as any}
        onClose={() => {
          setBulkMode(null);
          setSelectedRows({});
        }}
      />
    </div>
  );
}
