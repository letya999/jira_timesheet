import { useState } from 'react'
import { createRoute } from '@tanstack/react-router'
import {
  format,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
} from 'date-fns'
import type { ColumnDef } from '@tanstack/react-table'
import { appLayoutRoute } from './_app'
import { queryClient } from '@/lib/query-client'
import { timesheetKeys, useMyTimesheetEntries } from '@/features/timesheet/hooks'
import { useCapexReport, useOpexReport } from '@/features/reports/hooks'
import { useTriggerSync, useSyncStatus } from '@/features/sync/hooks'
import { getMyWorklogsApiV1TimesheetWorklogsGet } from '@/api/generated/sdk.gen'
import type { WorklogResponse } from '@/api/generated/types.gen'
import { ReportSummaryCard } from '@/components/shared/report-summary-card'
import { SyncStatusWidget } from '@/components/shared/sync-status-widget'
import { DataTableOrganism } from '@/components/shared/data-table-organism'
import { JiraKeyLink } from '@/components/jira/jira-key-link'
import { StatusBadge } from '@/components/ui/status-badge'
import { Skeleton } from '@/components/ui/skeleton'

const today = new Date()
const FMT = 'yyyy-MM-dd'

function toStatusVariant(
  status: string,
): 'todo' | 'in_progress' | 'done' | 'blocked' | 'review' | 'backlog' {
  switch (status.toUpperCase()) {
    case 'APPROVED':
      return 'done'
    case 'SUBMITTED':
      return 'review'
    case 'REJECTED':
      return 'blocked'
    case 'DRAFT':
      return 'todo'
    default:
      return 'backlog'
  }
}

const recentColumns: ColumnDef<WorklogResponse>[] = [
  {
    accessorKey: 'date',
    header: 'Date',
    cell: ({ getValue }) => format(new Date(getValue<string>()), 'dd MMM yyyy'),
  },
  {
    accessorKey: 'project_name',
    header: 'Project',
    cell: ({ getValue }) => getValue<string | null>() ?? '—',
  },
  {
    id: 'issue',
    header: 'Issue',
    cell: ({ row }) =>
      row.original.issue_key ? (
        <JiraKeyLink issueKey={row.original.issue_key} />
      ) : (
        <span className="text-muted-foreground text-sm">
          {row.original.issue_summary ?? '—'}
        </span>
      ),
  },
  {
    accessorKey: 'hours',
    header: 'Hours',
    cell: ({ getValue }) => (
      <span className="tabular-nums">{getValue<number>()}h</span>
    ),
  },
  {
    accessorKey: 'type',
    header: 'Type',
    cell: ({ getValue }) => getValue<string | null>() ?? '—',
  },
  {
    accessorKey: 'status',
    header: 'Status',
    cell: ({ getValue }) => {
      const s = getValue<string>()
      return (
        <StatusBadge status={toStatusVariant(s)}>
          {s}
        </StatusBadge>
      )
    },
  },
]

function computeKpi(entries: WorklogResponse[]) {
  const total = entries.reduce((s, e) => s + e.hours, 0)
  const capex = entries
    .filter((e) => e.category?.toUpperCase() === 'CAPEX')
    .reduce((s, e) => s + e.hours, 0)
  const opex = entries
    .filter((e) => e.category?.toUpperCase() === 'OPEX')
    .reduce((s, e) => s + e.hours, 0)
  return { total, capex, opex }
}

function DashboardPage() {
  const [jobId, setJobId] = useState<string | null>(null)

  const weekStart = startOfWeek(today, { weekStartsOn: 1 })
  const weekEnd = endOfWeek(today, { weekStartsOn: 1 })
  const monthStart = startOfMonth(today)
  const monthEnd = endOfMonth(today)

  const weekParams = {
    start_date: format(weekStart, FMT),
    end_date: format(weekEnd, FMT),
  }
  const monthParams = {
    start_date: format(monthStart, FMT),
    end_date: format(monthEnd, FMT),
  }

  const weekQuery = useMyTimesheetEntries(weekParams)
  const monthQuery = useMyTimesheetEntries(monthParams)
  const capexQuery = useCapexReport(monthParams)
  const opexQuery = useOpexReport(monthParams)
  const syncStatusQuery = useSyncStatus(jobId)
  const triggerSyncMutation = useTriggerSync()

  const weekEntries: WorklogResponse[] = weekQuery.data ?? []
  const monthEntries: WorklogResponse[] = monthQuery.data ?? []

  const weekKpi = computeKpi(weekEntries)
  const monthKpi = computeKpi(monthEntries)

  const capexRaw = capexQuery.data as Record<string, number> | undefined
  const opexRaw = opexQuery.data as Record<string, number> | undefined
  const capexMonthHours = capexRaw?.capex_hours ?? capexRaw?.total_hours ?? monthKpi.capex
  const opexMonthHours = opexRaw?.opex_hours ?? opexRaw?.total_hours ?? monthKpi.opex
  const monthTotal = capexRaw?.total_hours ?? monthKpi.total

  const syncJobData = syncStatusQuery.data as
    | { status?: string; progress?: number }
    | undefined
  const rawSyncStatus = syncJobData?.status
  const syncWidgetStatus: 'idle' | 'syncing' | 'success' | 'error' =
    rawSyncStatus === 'complete'
      ? 'success'
      : rawSyncStatus === 'failed'
        ? 'error'
        : jobId && rawSyncStatus
          ? 'syncing'
          : 'idle'
  const syncProgress = syncJobData?.progress ?? 0

  const handleTriggerSync = async () => {
    const result = await triggerSyncMutation.mutateAsync('my-worklogs')
    const typed = result as { job_id?: string } | null
    if (typed?.job_id) {
      setJobId(typed.job_id)
    }
  }

  const recentEntries = [...monthEntries]
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 10)

  const isLoading =
    weekQuery.isLoading || monthQuery.isLoading

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Dashboard</h1>

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-40 w-full rounded-lg" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          <ReportSummaryCard
            title="This Week"
            period={`${format(weekStart, 'MMM d')} – ${format(weekEnd, 'MMM d, yyyy')}`}
            totalHours={weekKpi.total}
            capexHours={weekKpi.capex}
            opexHours={weekKpi.opex}
          />
          <ReportSummaryCard
            title="This Month"
            period={format(monthStart, 'MMMM yyyy')}
            totalHours={monthKpi.total}
            capexHours={monthKpi.capex}
            opexHours={monthKpi.opex}
          />
          <ReportSummaryCard
            title="CapEx Total"
            period={`MTD — ${format(monthStart, 'MMMM yyyy')}`}
            totalHours={monthTotal}
            capexHours={capexMonthHours}
            opexHours={0}
          />
          <ReportSummaryCard
            title="OpEx Total"
            period={`MTD — ${format(monthStart, 'MMMM yyyy')}`}
            totalHours={monthTotal}
            capexHours={0}
            opexHours={opexMonthHours}
          />
        </div>
      )}

      <SyncStatusWidget
        status={syncWidgetStatus}
        progress={syncProgress}
        onTriggerSync={handleTriggerSync}
        className="max-w-xl"
      />

      <div className="space-y-2">
        <h2 className="text-lg font-semibold">Recent Activity</h2>
        {isLoading ? (
          <Skeleton className="h-64 w-full rounded-lg" />
        ) : (
          <DataTableOrganism
            columns={recentColumns}
            data={recentEntries}
            total={recentEntries.length}
          />
        )}
      </div>
    </div>
  )
}

export const dashboardRoute = createRoute({
  path: 'dashboard',
  getParentRoute: () => appLayoutRoute,
  loader: () => {
    const now = new Date()
    const loaderWeekStart = startOfWeek(now, { weekStartsOn: 1 })
    const loaderWeekEnd = endOfWeek(now, { weekStartsOn: 1 })
    const weekQuery = {
      start_date: format(loaderWeekStart, 'yyyy-MM-dd'),
      end_date: format(loaderWeekEnd, 'yyyy-MM-dd'),
    }
    return queryClient
      .prefetchQuery({
        queryKey: timesheetKeys.myEntries(weekQuery),
        queryFn: () =>
          getMyWorklogsApiV1TimesheetWorklogsGet({ query: weekQuery }).then(
            (r) => r.data,
          ),
      })
      .catch(() => null)
  },
  component: DashboardPage,
})
