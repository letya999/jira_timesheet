import { useMemo, useState } from 'react'
import {
  endOfMonth,
  endOfWeek,
  isAfter,
  parseISO,
  startOfMonth,
  startOfWeek,
} from 'date-fns'
import type { ColumnDef } from '@tanstack/react-table'
import { useTimesheetEntries } from '@/features/timesheet/hooks'
import { useReportOrgUnits, useReportProjects } from '@/features/reports/hooks'
import { useTriggerSync, useSyncStatus } from '@/features/sync/hooks'
import type { WorklogResponse } from '@/api/generated/types.gen'
import { ReportSummaryCard } from '@/components/shared/report-summary-card'
import { SyncStatusWidget } from '@/components/shared/sync-status-widget'
import { DataTableOrganism } from '@/components/shared/data-table-organism'
import { CollapsibleBlock } from '@/components/shared/collapsible-block'
import { JiraKeyLink } from '@/components/jira/jira-key-link'
import { StatusBadge } from '@/components/ui/status-badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { useTimezone } from '@/hooks/use-timezone'
import { dateUtils } from '@/lib/date-utils'
import { useTranslation } from 'react-i18next'

const FMT = 'yyyy-MM-dd'

type FilteredTimesheetResponse = { items?: WorklogResponse[] } | WorklogResponse[] | undefined

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

function extractWorklogs(data: FilteredTimesheetResponse): WorklogResponse[] {
  if (Array.isArray(data)) {
    return data
  }

  if (data && Array.isArray(data.items)) {
    return data.items
  }

  return []
}

export default function DashboardPage() {
  const { t } = useTranslation()
  const [jobId, setJobId] = useState<string | null>(null)
  const { timezone } = useTimezone()

  const [weekAnchor, setWeekAnchor] = useState(() => dateUtils.now())
  const [projectFilter, setProjectFilter] = useState<string>('all')
  const [teamFilter, setTeamFilter] = useState<string>('all')

  const { data: projects = [] } = useReportProjects()
  const { data: teams = [] } = useReportOrgUnits()

  const weekStart = startOfWeek(weekAnchor, { weekStartsOn: 1 })
  const weekEnd = endOfWeek(weekAnchor, { weekStartsOn: 1 })
  const monthStart = startOfMonth(weekStart)
  const monthEndCalendar = endOfMonth(weekStart)
  const monthEnd = isAfter(weekEnd, monthEndCalendar) ? monthEndCalendar : weekEnd

  const commonFilters = useMemo(
    () => ({
      project_id: projectFilter !== 'all' ? Number(projectFilter) : undefined,
      org_unit_id: teamFilter !== 'all' ? Number(teamFilter) : undefined,
      page: 1,
      size: 500,
    }),
    [projectFilter, teamFilter],
  )

  const weekParams = useMemo(
    () => ({
      ...commonFilters,
      start_date: dateUtils.formatPlain(weekStart, FMT),
      end_date: dateUtils.formatPlain(weekEnd, FMT),
    }),
    [commonFilters, weekStart, weekEnd],
  )

  const monthParams = useMemo(
    () => ({
      ...commonFilters,
      start_date: dateUtils.formatPlain(monthStart, FMT),
      end_date: dateUtils.formatPlain(monthEnd, FMT),
    }),
    [commonFilters, monthStart, monthEnd],
  )

  const weekQuery = useTimesheetEntries(weekParams)
  const monthQuery = useTimesheetEntries(monthParams)
  const syncStatusQuery = useSyncStatus(jobId)
  const triggerSyncMutation = useTriggerSync()

  const weekEntries = extractWorklogs(weekQuery.data as FilteredTimesheetResponse)
  const monthEntries = extractWorklogs(monthQuery.data as FilteredTimesheetResponse)

  const weekKpi = computeKpi(weekEntries)
  const monthKpi = computeKpi(monthEntries)

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

  const recentColumns: ColumnDef<WorklogResponse>[] = [
    {
      accessorKey: 'date',
      header: t('common.date'),
      cell: ({ getValue }) => dateUtils.format(getValue<string>(), 'dd MMM yyyy', timezone),
    },
    {
      accessorKey: 'project_name',
      header: t('common.project'),
      cell: ({ getValue }) => getValue<string | null>() ?? '-',
    },
    {
      id: 'issue',
      header: t('common.task'),
      cell: ({ row }) =>
        row.original.issue_key ? (
          <JiraKeyLink issueKey={row.original.issue_key} />
        ) : (
          <span className="text-muted-foreground text-sm">
            {row.original.issue_summary ?? '-'}
          </span>
        ),
    },
    {
      accessorKey: 'hours',
      header: t('common.hours'),
      cell: ({ getValue }) => (
        <span className="tabular-nums">{getValue<number>()}h</span>
      ),
    },
    {
      accessorKey: 'type',
      header: t('common.type'),
      cell: ({ getValue }) => getValue<string | null>() ?? '-',
    },
    {
      accessorKey: 'status',
      header: t('common.status'),
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

  const recentEntries = [...weekEntries]
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 10)

  const isLoading =
    weekQuery.isLoading || monthQuery.isLoading

  const resetFilters = () => {
    setWeekAnchor(dateUtils.now())
    setProjectFilter('all')
    setTeamFilter('all')
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">{t('dashboard.title')}</h1>

      <CollapsibleBlock title={t('web.dashboard.filters_title')} defaultOpen>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="space-y-2">
            <Label htmlFor="dashboard-week">{t('web.dashboard.week')}</Label>
            <Input
              id="dashboard-week"
              type="date"
              value={dateUtils.formatPlain(weekAnchor, FMT)}
              onChange={(e) => {
                if (!e.target.value) return
                setWeekAnchor(parseISO(e.target.value))
              }}
            />
            <p className="text-xs text-muted-foreground">
              {dateUtils.format(weekStart, 'MMM d, yyyy', timezone)} - {dateUtils.format(weekEnd, 'MMM d, yyyy', timezone)}
            </p>
          </div>

          <div className="space-y-2">
            <Label>{t('common.project')}</Label>
            <Select value={projectFilter} onValueChange={setProjectFilter}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder={t('journal.all_projects')} />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectItem value="all">{t('journal.all_projects')}</SelectItem>
                  {projects.map((project) => (
                    <SelectItem key={project.id} value={String(project.id)}>
                      {project.key} - {project.name}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>{t('common.team')}</Label>
            <Select value={teamFilter} onValueChange={setTeamFilter}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder={t('journal.all_teams')} />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectItem value="all">{t('journal.all_teams')}</SelectItem>
                  {teams.map((team) => (
                    <SelectItem key={team.id} value={String(team.id)}>
                      {team.name}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="mt-4">
          <Button type="button" variant="outline" onClick={resetFilters}>
            {t('web.dashboard.reset_filters')}
          </Button>
        </div>
      </CollapsibleBlock>

      {isLoading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-40 w-full rounded-lg" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <ReportSummaryCard
            testId="kpi-selected-week"
            title={t('web.dashboard.selected_week')}
            period={`${dateUtils.format(weekStart, 'MMM d', timezone)} - ${dateUtils.format(weekEnd, 'MMM d, yyyy', timezone)}`}
            totalHours={weekKpi.total}
            capexHours={weekKpi.capex}
            opexHours={weekKpi.opex}
          />
          <ReportSummaryCard
            testId="kpi-selected-month"
            title={t('web.dashboard.selected_month')}
            period={`${dateUtils.format(monthStart, 'MMM d', timezone)} - ${dateUtils.format(monthEnd, 'MMM d, yyyy', timezone)}`}
            totalHours={monthKpi.total}
            capexHours={monthKpi.capex}
            opexHours={monthKpi.opex}
          />
          <ReportSummaryCard
            testId="kpi-capex-total"
            title={t('web.dashboard.capex_total')}
            period={`MTD - ${dateUtils.format(monthStart, 'MMMM yyyy', timezone)}`}
            totalHours={monthKpi.total}
            capexHours={monthKpi.capex}
            opexHours={0}
          />
          <ReportSummaryCard
            testId="kpi-opex-total"
            title={t('web.dashboard.opex_total')}
            period={`MTD - ${dateUtils.format(monthStart, 'MMMM yyyy', timezone)}`}
            totalHours={monthKpi.total}
            capexHours={0}
            opexHours={monthKpi.opex}
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
        <h2 className="text-lg font-semibold">{t('web.dashboard.recent_activity')}</h2>
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
