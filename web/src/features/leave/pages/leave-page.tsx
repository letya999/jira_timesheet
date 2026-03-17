import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { CalendarPlus, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import type { DateRange } from 'react-day-picker';
import type { JiraUserResponse, LeaveStatus, LeaveType } from '@/api/generated/types.gen';
import {
  useLeaveRequests,
  useCreateLeaveRequest,
  useAllLeaveRequests,
  useTeamLeaveRequests,
  useUpdateLeaveStatus,
} from '@/features/leave/hooks';
import { useCurrentUser } from '@/features/auth/hooks';
import { useReportOrgUnits } from '@/features/reports/hooks';
import { useJiraUsers } from '@/features/users/hooks';
import { LEAVE_TYPE_LABELS } from '@/components/leave/leave-absence-badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { DateRangePicker } from '@/components/ui/date-range-picker';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FilterToggleButton } from '@/components/shared/filter-toggle-button';
import { LeaveFiltersPanel } from '../components/leave-filters-panel';
import { LeaveOverviewTab } from '../components/leave-overview-tab';
import { LeaveAbsenceList } from '../components/leave-absence-list';
import { applyLeaveFilters, buildUserOrgUnitMap } from '../utils';
import type { LeaveTab } from '../types';
import { createDefaultLeaveFilters } from '../types';
import { useTranslation } from 'react-i18next';
import { canAccessManagerPages, isAdminRole } from '@/lib/rbac';
import { getMyTeamsApiV1OrgMyTeamsGet } from '@/api/generated/sdk.gen';

export default function LeavePage() {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<LeaveTab>('overview');
  const [isFiltersOpen, setIsFiltersOpen] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [type, setType] = useState<LeaveType>('VACATION');
  const [dateRange, setDateRange] = useState<{ from: Date; to: Date } | undefined>();
  const [reason, setReason] = useState('');
  const [filters, setFilters] = useState(createDefaultLeaveFilters());

  const { data: currentUser } = useCurrentUser();
  const myRequestsQuery = useLeaveRequests();
  const createMutation = useCreateLeaveRequest();
  const updateStatusMutation = useUpdateLeaveStatus();

  const rawRole = (currentUser as { role?: string } | undefined)?.role;
  const canManageLeaves = canAccessManagerPages(rawRole);
  const isAdmin = isAdminRole(rawRole);

  const allRequestsQuery = useAllLeaveRequests(
    {
      start_date: filters.dateRange.from ? format(filters.dateRange.from, 'yyyy-MM-dd') : undefined,
      end_date: filters.dateRange.to ? format(filters.dateRange.to, 'yyyy-MM-dd') : undefined,
    },
    { enabled: isAdmin },
  );

  const teamRequestsQuery = useTeamLeaveRequests({ enabled: !isAdmin });
  const { data: teams = [] } = useReportOrgUnits();
  const myTeamsQuery = useQuery({
    queryKey: ['leave', 'my-teams'],
    enabled: canManageLeaves && !isAdmin,
    queryFn: async () => {
      const res = await getMyTeamsApiV1OrgMyTeamsGet({ throwOnError: true });
      return Array.isArray(res.data) ? res.data : [];
    },
  });
  const { data: employeesPage } = useJiraUsers({ page: 1, size: 500 });

  const employees = useMemo(() => {
    const page = employeesPage as { items?: JiraUserResponse[] } | undefined;
    return page?.items ?? [];
  }, [employeesPage]);

  const userOrgMap = useMemo(() => buildUserOrgUnitMap(employees), [employees]);

  const teamOptions = useMemo(() => {
    if (activeTab !== 'management') {
      return teams.map((team) => ({ label: team.name, value: String(team.id) }));
    }
    if (!canManageLeaves) return [];
    if (isAdmin) {
      return teams.map((team) => ({ label: team.name, value: String(team.id) }));
    }
    const myTeams = myTeamsQuery.data ?? [];
    return myTeams.map((team) => ({ label: team.name, value: String(team.id) }));
  }, [activeTab, canManageLeaves, isAdmin, myTeamsQuery.data, teams]);

  const employeeOptions = useMemo(() => {
    const byId = new Map<number, string>();
    for (const employee of employees) {
      const requestUserId = employee.user_id ?? employee.id;
      if (!byId.has(requestUserId)) {
        byId.set(requestUserId, employee.display_name || t('web.leave.user_id', { id: requestUserId }));
      }
    }
    return Array.from(byId.entries()).map(([id, label]) => ({
      value: String(id),
      label,
    }));
  }, [employees, t]);

  const rawOverviewRequests = useMemo(
    () =>
      isAdmin
        ? allRequestsQuery.data ?? []
        : teamRequestsQuery.data ?? myRequestsQuery.data ?? [],
    [allRequestsQuery.data, isAdmin, myRequestsQuery.data, teamRequestsQuery.data],
  );
  const rawMyRequests = useMemo(() => myRequestsQuery.data ?? [], [myRequestsQuery.data]);
  const rawManagementRequests = useMemo(
    () => (canManageLeaves ? (isAdmin ? allRequestsQuery.data ?? [] : teamRequestsQuery.data ?? []) : []),
    [allRequestsQuery.data, canManageLeaves, isAdmin, teamRequestsQuery.data],
  );

  const overviewRequests = useMemo(
    () => applyLeaveFilters(rawOverviewRequests, filters, userOrgMap),
    [rawOverviewRequests, filters, userOrgMap],
  );

  const myRequests = useMemo(
    () => applyLeaveFilters(rawMyRequests, filters, userOrgMap, { ignoreOrgFilters: true }),
    [rawMyRequests, filters, userOrgMap],
  );

  const managementRequests = useMemo(
    () => applyLeaveFilters(rawManagementRequests, filters, userOrgMap),
    [rawManagementRequests, filters, userOrgMap],
  );

  const handleCreateRequest = async () => {
    if (!dateRange?.from || !dateRange?.to) {
      toast.error(t('web.leave.select_date_range'));
      return;
    }

    try {
      await createMutation.mutateAsync({
        leave_type: type,
        start_date: format(dateRange.from, 'yyyy-MM-dd'),
        end_date: format(dateRange.to, 'yyyy-MM-dd'),
        reason,
      });
      toast.success(t('leaves.request_submitted'));
      setIsDialogOpen(false);
      setDateRange(undefined);
      setReason('');
    } catch {
      toast.error(t('leaves.request_failed'));
    }
  };

  const handleStatusChange = async (leaveId: number, status: LeaveStatus) => {
    if (!canManageLeaves) return;

    try {
      await updateStatusMutation.mutateAsync({ leaveId, status });
      toast.success(t('web.leave.status_updated'));
    } catch {
      toast.error(t('web.leave.status_update_failed'));
    }
  };

  const overviewLoading = isAdmin ? allRequestsQuery.isLoading : teamRequestsQuery.isLoading;
  const currentUserId = (currentUser as { id?: number } | undefined)?.id;

  const handleSelfCancel = async (leaveId: number) => {
    try {
      await updateStatusMutation.mutateAsync({ leaveId, status: 'CANCELLED' });
      toast.success(t('web.leave.status_updated'));
    } catch {
      toast.error(t('web.leave.status_update_failed'));
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t('leaves.title')}</h1>
          <p className="text-muted-foreground">{t('web.leave.subtitle')}</p>
        </div>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <CalendarPlus className="mr-2 size-4" />
              {t('leaves.submit_request')}
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t('web.leave.new_request')}</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="type">{t('leaves.type')}</Label>
                <Select value={type} onValueChange={(v) => setType(v as LeaveType)}>
                  <SelectTrigger id="type">
                    <SelectValue placeholder={t('web.leave.select_type')} />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(LEAVE_TYPE_LABELS).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>{t('web.reports.date_range')}</Label>
                <DateRangePicker
                  date={dateRange}
                  setDate={(range) => setDateRange(range as { from: Date; to: Date })}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="reason">{t('leaves.reason')} ({t('leaves.optional').toLowerCase()})</Label>
                <Textarea
                  id="reason"
                  placeholder={t('web.leave.reason_placeholder')}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                {t('common.cancel')}
              </Button>
              <Button onClick={handleCreateRequest} disabled={createMutation.isPending}>
                {createMutation.isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
                {t('leaves.submit_request')}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <LeaveFiltersPanel
        open={isFiltersOpen}
        onOpenChange={setIsFiltersOpen}
        trigger={
          <FilterToggleButton
            isOpen={isFiltersOpen}
            showLabel={t('employees.show_filters', 'Show Filters')}
            hideLabel={t('employees.hide_filters', 'Hide Filters')}
            onClick={() => setIsFiltersOpen((prev) => !prev)}
          />
        }
        activeTab={activeTab}
        filters={filters}
        teamOptions={teamOptions}
        employeeOptions={employeeOptions}
        onDateRangeChange={(range: DateRange | undefined) => {
          setFilters((prev) => ({
            ...prev,
            dateRange: {
              from: range?.from,
              to: range?.to,
            },
          }));
        }}
        onTeamIdsChange={(teamIds) => setFilters((prev) => ({ ...prev, teamIds }))}
        onEmployeeIdsChange={(employeeIds) => setFilters((prev) => ({ ...prev, employeeIds }))}
        onLeaveTypesChange={(leaveTypes) => setFilters((prev) => ({ ...prev, leaveTypes }))}
        onStatusesChange={(statuses) => setFilters((prev) => ({ ...prev, statuses }))}
      />

      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as LeaveTab)}>
        <TabsList className={`grid w-full h-11 ${canManageLeaves ? 'grid-cols-3' : 'grid-cols-2'}`}>
          <TabsTrigger value="overview">{t('web.leave.overview_tab')}</TabsTrigger>
          <TabsTrigger value="my">{t('leaves.my_leaves')}</TabsTrigger>
          {canManageLeaves ? <TabsTrigger value="management">{t('web.leave.management_tab')}</TabsTrigger> : null}
        </TabsList>

        <TabsContent value="overview" className="mt-4">
          {overviewLoading ? (
            <div className="flex h-64 items-center justify-center rounded-lg border bg-muted/10">
              <Loader2 className="size-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <LeaveOverviewTab
              requests={overviewRequests}
              startDate={filters.dateRange.from ?? new Date()}
            />
          )}
        </TabsContent>

        <TabsContent value="my" className="mt-4">
          <LeaveAbsenceList
            requests={myRequests}
            isLoading={myRequestsQuery.isLoading}
            emptyTitle={t('web.leave.no_requests')}
            emptySubtitle={t('web.leave.no_requests_hint')}
            currentUserId={currentUserId}
            allowSelfCancel
            onCancel={handleSelfCancel}
          />
        </TabsContent>

        {canManageLeaves ? (
          <TabsContent value="management" className="mt-4">
            <LeaveAbsenceList
              requests={managementRequests}
              isLoading={isAdmin ? allRequestsQuery.isLoading : teamRequestsQuery.isLoading}
              emptyTitle={t('web.leave.no_requests_to_process')}
              emptySubtitle={t('web.leave.no_requests_to_process_hint')}
              canManage
              onApprove={(id) => handleStatusChange(id, 'APPROVED')}
              onReject={(id) => handleStatusChange(id, 'REJECTED')}
              onCancel={(id) => handleStatusChange(id, 'CANCELLED')}
            />
          </TabsContent>
        ) : null}
      </Tabs>
    </div>
  );
}
