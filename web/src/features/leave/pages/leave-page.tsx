import { useMemo, useState } from 'react';
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
import { LeaveFiltersPanel } from '../components/leave-filters-panel';
import { LeaveOverviewTab } from '../components/leave-overview-tab';
import { LeaveAbsenceList } from '../components/leave-absence-list';
import { applyLeaveFilters, buildUserOrgUnitMap } from '../utils';
import type { LeaveTab } from '../types';
import { createDefaultLeaveFilters } from '../types';

export default function LeavePage() {
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

  const role = String((currentUser as { role?: string } | undefined)?.role ?? '').toLowerCase();
  const canManageLeaves =
    role === 'admin' ||
    role === 'manager' ||
    role === 'pm' ||
    role === 'ceo' ||
    (currentUser as { is_admin?: boolean } | undefined)?.is_admin === true;

  const allRequestsQuery = useAllLeaveRequests(
    {
      start_date: filters.dateRange.from ? format(filters.dateRange.from, 'yyyy-MM-dd') : undefined,
      end_date: filters.dateRange.to ? format(filters.dateRange.to, 'yyyy-MM-dd') : undefined,
    },
    { enabled: canManageLeaves },
  );

  const teamRequestsQuery = useTeamLeaveRequests({ enabled: !canManageLeaves });
  const { data: teams = [] } = useReportOrgUnits();
  const { data: employeesPage } = useJiraUsers({ page: 1, size: 500 });

  const employees = useMemo(() => {
    const page = employeesPage as { items?: JiraUserResponse[] } | undefined;
    return page?.items ?? [];
  }, [employeesPage]);

  const userOrgMap = useMemo(() => buildUserOrgUnitMap(employees), [employees]);

  const teamOptions = useMemo(
    () => teams.map((team) => ({ label: team.name, value: String(team.id) })),
    [teams],
  );

  const employeeOptions = useMemo(() => {
    const byId = new Map<number, string>();
    for (const employee of employees) {
      const requestUserId = employee.user_id ?? employee.id;
      if (!byId.has(requestUserId)) {
        byId.set(requestUserId, employee.display_name || `User ${requestUserId}`);
      }
    }
    return Array.from(byId.entries()).map(([id, label]) => ({
      value: String(id),
      label,
    }));
  }, [employees]);

  const rawOverviewRequests = useMemo(
    () =>
      canManageLeaves
        ? allRequestsQuery.data ?? []
        : teamRequestsQuery.data ?? myRequestsQuery.data ?? [],
    [canManageLeaves, allRequestsQuery.data, teamRequestsQuery.data, myRequestsQuery.data],
  );
  const rawMyRequests = useMemo(() => myRequestsQuery.data ?? [], [myRequestsQuery.data]);
  const rawManagementRequests = useMemo(
    () => (canManageLeaves ? allRequestsQuery.data ?? [] : []),
    [canManageLeaves, allRequestsQuery.data],
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
      toast.error('Please select a date range');
      return;
    }

    try {
      await createMutation.mutateAsync({
        leave_type: type,
        start_date: format(dateRange.from, 'yyyy-MM-dd'),
        end_date: format(dateRange.to, 'yyyy-MM-dd'),
        reason,
      });
      toast.success('Leave request submitted');
      setIsDialogOpen(false);
      setDateRange(undefined);
      setReason('');
    } catch {
      toast.error('Failed to submit leave request');
    }
  };

  const handleStatusChange = async (leaveId: number, status: LeaveStatus) => {
    if (!canManageLeaves) return;

    try {
      await updateStatusMutation.mutateAsync({ leaveId, status });
      toast.success('Leave status updated');
    } catch {
      toast.error('Failed to update leave status');
    }
  };

  const overviewLoading = canManageLeaves ? allRequestsQuery.isLoading : teamRequestsQuery.isLoading;
  const currentUserId = (currentUser as { id?: number } | undefined)?.id;

  const handleSelfCancel = async (leaveId: number) => {
    try {
      await updateStatusMutation.mutateAsync({ leaveId, status: 'CANCELLED' });
      toast.success('Leave status updated');
    } catch {
      toast.error('Failed to update leave status');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Leave</h1>
          <p className="text-muted-foreground">Планирование и управление отсутствиями команды.</p>
        </div>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <CalendarPlus className="mr-2 size-4" />
              Request Leave
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>New Leave Request</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="type">Leave Type</Label>
                <Select value={type} onValueChange={(v) => setType(v as LeaveType)}>
                  <SelectTrigger id="type">
                    <SelectValue placeholder="Select type" />
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
                <Label>Date Range</Label>
                <DateRangePicker
                  date={dateRange}
                  setDate={(range) => setDateRange(range as { from: Date; to: Date })}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="reason">Reason (optional)</Label>
                <Textarea
                  id="reason"
                  placeholder="Tell us why..."
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreateRequest} disabled={createMutation.isPending}>
                {createMutation.isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
                Submit Request
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <LeaveFiltersPanel
        open={isFiltersOpen}
        onOpenChange={setIsFiltersOpen}
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
        <TabsList className="grid w-full grid-cols-3 h-11">
          <TabsTrigger value="overview">Список отсутствий</TabsTrigger>
          <TabsTrigger value="my">Мои отсутствия</TabsTrigger>
          <TabsTrigger value="management">Управление отсутствиями</TabsTrigger>
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
            emptyTitle="Нет заявок"
            emptySubtitle="Создайте заявку на отпуск или другой тип отсутствия"
            currentUserId={currentUserId}
            allowSelfCancel
            onCancel={handleSelfCancel}
          />
        </TabsContent>

        <TabsContent value="management" className="mt-4">
          {!canManageLeaves ? (
            <div className="rounded-lg border bg-muted/20 p-8 text-center text-muted-foreground">
              У вас нет прав на управление заявками отсутствий.
            </div>
          ) : (
            <LeaveAbsenceList
              requests={managementRequests}
              isLoading={allRequestsQuery.isLoading}
              emptyTitle="Нет заявок для обработки"
              emptySubtitle="По выбранным фильтрам нет запросов на согласование"
              canManage
              onApprove={(id) => handleStatusChange(id, 'APPROVED')}
              onReject={(id) => handleStatusChange(id, 'REJECTED')}
              onCancel={(id) => handleStatusChange(id, 'CANCELLED')}
            />
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
