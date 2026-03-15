import * as React from 'react';
import { useJiraUsers, useUpdateJiraUser, useSyncUsersFromJira, usePromoteUser } from '@/features/users/hooks';
import { useOrgTree } from '@/features/org/hooks';
import { useCurrentUser } from '@/features/auth/hooks';
import { getEmployeeColumns } from '../components/employee-columns';
import { DataTable } from '@/components/ui/data-table';
import { EmployeeHierarchy } from '../components/employee-hierarchy';
import { TempPasswordDialog } from '../components/temp-password-dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { RefreshCw, Search, Users } from 'lucide-react';
import { toast } from '@/lib/toast';
import { Skeleton } from '@/components/ui/skeleton';

import { UserPromoteResponse } from '@/api/generated/types.gen';

export function EmployeesPage() {
  const [search, setSearch] = React.useState('');
  const [debouncedSearch, setDebouncedSearch] = React.useState('');
  const [page, setPage] = React.useState(1);
  const [tempCredentials, setTempCredentials] = React.useState<UserPromoteResponse | null>(null);

  const { data: currentUser } = useCurrentUser();
  const isAdmin = currentUser?.role === 'Admin';

  // Debounce search
  React.useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  const { data: employeesData, isLoading: employeesLoading } = useJiraUsers({
    page,
    size: 20,
    search: debouncedSearch,
  });

  const { data: orgUnits = [], isLoading: orgLoading } = useOrgTree();

  const updateMutation = useUpdateJiraUser();
  const syncMutation = useSyncUsersFromJira();
  const promoteMutation = usePromoteUser();

  const handleUpdate = React.useCallback((id: number, data: Partial<{ org_unit_id: number | null; is_active: boolean; weekly_quota: number }>) => {
    updateMutation.mutate({ id, data }, {
      onSuccess: () => toast.success('Employee updated'),
      onError: () => toast.error('Failed to update employee'),
    });
  }, [updateMutation]);

  const handleSync = () => {
    syncMutation.mutate(undefined, {
      onSuccess: () => toast.success('Sync started'),
      onError: () => toast.error('Failed to start sync'),
    });
  };

  const handlePromote = React.useCallback((id: number) => {
    promoteMutation.mutate(id, {
      onSuccess: (data: UserPromoteResponse) => {
        setTempCredentials(data);
        toast.success('System user created');
      },
      onError: () => toast.error('Failed to create system user'),
    });
  }, [promoteMutation]);

  const columns = React.useMemo(
    () =>
      getEmployeeColumns({
        orgUnits: orgUnits as any,
        onUpdate: handleUpdate,
        onPromote: handlePromote,
        isAdmin,
      }),
    [orgUnits, isAdmin, handleUpdate, handlePromote]
  );

  const employees = Array.isArray(employeesData) ? employeesData : ((employeesData as any)?.items ?? []);
  const total = (employeesData as any)?.total ?? (Array.isArray(employeesData) ? employeesData.length : 0);

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Employees</h1>
          <p className="text-muted-foreground">Manage Jira employees and system access.</p>
        </div>
        <Button onClick={handleSync} disabled={syncMutation.isPending} variant="outline">
          <RefreshCw className={`mr-2 h-4 w-4 ${syncMutation.isPending ? 'animate-spin' : ''}`} />
          Sync from Jira
        </Button>
      </div>

      <Tabs defaultValue="list" className="w-full">
        <TabsList>
          <TabsTrigger value="list" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            List View
          </TabsTrigger>
          <TabsTrigger value="hierarchy" className="flex items-center gap-2">
            <RefreshCw className="h-4 w-4" />
            Hierarchy View
          </TabsTrigger>
        </TabsList>

        <TabsContent value="list" className="space-y-4 pt-4">
          <div className="flex items-center gap-2 max-w-sm">
            <div className="relative w-full">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search employees..."
                className="pl-8"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>

          {employeesLoading || orgLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-20 w-full" />
            </div>
          ) : (
            <DataTable 
              columns={columns} 
              data={employees} 
            />
          )}
          
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>Total: {total} employees</span>
            <div className="flex gap-2">
               <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
               >
                 Previous
               </Button>
               <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setPage(p => p + 1)}
                disabled={employees.length < 20}
               >
                 Next
               </Button>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="hierarchy" className="pt-4">
          {orgLoading || employeesLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : (
            <EmployeeHierarchy units={orgUnits as any} employees={employees} />
          )}
        </TabsContent>
      </Tabs>

      <TempPasswordDialog
        credentials={tempCredentials as any}
        onClose={() => setTempCredentials(null)}
      />
    </div>
  );
}
