/* eslint-disable react-refresh/only-export-components */
import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createRoute } from '@tanstack/react-router'
import { addDays, format, parseISO, startOfWeek } from 'date-fns'
import {
  Loader2,
  TableProperties,
  Users,
  UserRound,
  ShieldAlert,
  MessageSquareText,
} from 'lucide-react'
import { appLayoutRoute } from './_app'
import {
  approvePeriodApiV1ApprovalsPeriodIdApprovePost,
  getDashboardDataApiV1ReportsDashboardGet,
  getEmployeesApiV1OrgEmployeesGet,
  getMyTeamsApiV1OrgMyTeamsGet,
  getOrgUnitsApiV1OrgUnitsGet,
  getTeamPeriodsApiV1ApprovalsTeamPeriodsGet,
} from '@/api/generated/sdk.gen'
import { useCurrentUser } from '@/features/auth/hooks'
import { dateUtils } from '@/lib/date-utils'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import { useTranslation } from 'react-i18next'
import { CollapsibleFilterBlock } from '@/components/shared/collapsible-filter-block'
import { CollapsibleBlock } from '@/components/shared/collapsible-block'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
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
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { PivotTable } from '@/components/shared/pivot-table'
import { CardList } from '@/components/shared/card-list'

export const controlSheetRoute = createRoute({
  path: 'control-sheet',
  getParentRoute: () => appLayoutRoute,
  component: ControlSheet,
})

type TeamOption = {
  id: number
  name: string
}

type EmployeeRecord = {
  id: number
  display_name: string
  org_unit_id: number | null
  user_id: number | null
}

type DashboardRow = {
  Date: string
  Hours: number
  User: string
  'User ID': number | null
  OrgUnit: string
  'OrgUnit ID': number | null
  Task: string
  'Issue Key': string
  Description: string
}

type PeriodRow = {
  id: number
  user_id: number
  status: string
  comment?: string | null
}

type TaskSummary = {
  name: string
  dayHours: Record<string, number>
  total: number
}

type EmployeeSummary = {
  key: string
  userId: number | null
  name: string
  team: string
  teamId: number | null
  status: string
  periodId: number | null
  periodComment: string | null
  dayHours: Record<string, number>
  total: number
  tasks: TaskSummary[]
}

const WEEKDAY_KEYS = [
  'web.control_sheet.weekday_mon',
  'web.control_sheet.weekday_tue',
  'web.control_sheet.weekday_wed',
  'web.control_sheet.weekday_thu',
  'web.control_sheet.weekday_fri',
  'web.control_sheet.weekday_sat',
  'web.control_sheet.weekday_sun',
]

function normalizeName(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, ' ')
}

function statusClass(status: string) {
  const upper = status.toUpperCase()
  if (upper === 'APPROVED') return 'bg-emerald-100 text-emerald-800 border-emerald-200'
  if (upper === 'SUBMITTED') return 'bg-blue-100 text-blue-800 border-blue-200'
  if (upper === 'REJECTED') return 'bg-red-100 text-red-800 border-red-200'
  return 'bg-muted text-muted-foreground border-border'
}

function normalizeStatus(status: string) {
  return status.toUpperCase()
}

function taskTitle(row: DashboardRow, manualWorklogLabel: string) {
  const issueKey = row['Issue Key']?.trim()
  const task = row.Task?.trim()
  const description = row.Description?.trim()

  if (issueKey && issueKey !== 'N/A') {
    return task ? `${issueKey} ${task}` : issueKey
  }

  if (description) return description
  if (task) return task
  return manualWorklogLabel
}

function statusLabel(t: (key: string) => string, status: string) {
  const upper = status.toUpperCase()
  if (upper === 'OPEN') return t('common.status_open')
  if (upper === 'SUBMITTED') return t('common.status_submitted')
  if (upper === 'APPROVED') return t('common.status_approved')
  if (upper === 'REJECTED') return t('common.status_rejected')
  if (upper === 'CANCELLED') return t('common.status_cancelled')
  return upper
}

function ControlSheet() {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const { data: currentUser, isLoading: isUserLoading } = useCurrentUser()

  const [weekAnchor, setWeekAnchor] = useState(() => dateUtils.now())
  const [selectedTeam, setSelectedTeam] = useState<string>('all')
  const [statusDialogOpen, setStatusDialogOpen] = useState(false)
  const [statusTarget, setStatusTarget] = useState<EmployeeSummary | null>(null)
  const [statusDraft, setStatusDraft] = useState<string>('APPROVED')
  const [statusComment, setStatusComment] = useState<string>('')

  // Pagination state for Employee Summary
  const [page, setPage] = useState(1)
  const pageSize = 10

  const role = String((currentUser as { role?: string } | undefined)?.role ?? '').toLowerCase()
  const isAdminRole = role === 'admin' || role === 'ceo'
  const isManagerRole = role === 'pm' || role === 'manager'
  const canViewControlSheet = isAdminRole || isManagerRole

  const weekStart = useMemo(
    () => startOfWeek(weekAnchor, { weekStartsOn: 1 }),
    [weekAnchor],
  )
  const weekEnd = useMemo(() => addDays(weekStart, 6), [weekStart])

  const weekColumns = useMemo(
    () =>
      Array.from({ length: 7 }).map((_, index) => {
        const day = addDays(weekStart, index)
        return {
          date: format(day, 'yyyy-MM-dd'),
          label: `${t(WEEKDAY_KEYS[index] ?? 'web.control_sheet.weekday_mon')} ${format(day, 'dd')}`,
        }
      }),
    [weekStart, t],
  )

  const startDate = format(weekStart, 'yyyy-MM-dd')
  const endDate = format(weekEnd, 'yyyy-MM-dd')

  useEffect(() => {
    setPage(1)
  }, [selectedTeam, weekAnchor])

  const teamsQuery = useQuery({
    queryKey: ['control-sheet', 'teams', role],
    enabled: canViewControlSheet && !isUserLoading,
    queryFn: async () => {
      if (isAdminRole) {
        const res = await getOrgUnitsApiV1OrgUnitsGet({ throwOnError: true })
        return (Array.isArray(res.data) ? res.data : []) as TeamOption[]
      }
      const res = await getMyTeamsApiV1OrgMyTeamsGet({ throwOnError: true })
      return (Array.isArray(res.data) ? res.data : []) as TeamOption[]
    },
    staleTime: 60_000,
  })

  const teams = useMemo(() => teamsQuery.data ?? [], [teamsQuery.data])
  const teamIds = useMemo(() => new Set(teams.map((t) => t.id)), [teams])
  const teamNameById = useMemo(
    () => new Map(teams.map((t) => [t.id, t.name])),
    [teams],
  )

  useEffect(() => {
    if (selectedTeam !== 'all' && teams.length > 0 && !teamIds.has(Number(selectedTeam))) {
      setSelectedTeam('all')
    }
  }, [selectedTeam, teams.length, teamIds])

  const dashboardQuery = useQuery({
    queryKey: ['control-sheet', 'dashboard', startDate, endDate, selectedTeam],
    enabled: canViewControlSheet && !isUserLoading,
    queryFn: async () => {
      const res = await getDashboardDataApiV1ReportsDashboardGet({
        throwOnError: true,
        query: {
          start_date: startDate,
          end_date: endDate,
          org_unit_id: selectedTeam !== 'all' ? Number(selectedTeam) : undefined,
        },
      })
      const payload = res.data as { data?: DashboardRow[] }
      return Array.isArray(payload?.data) ? payload.data : []
    },
  })

  const periodsQuery = useQuery({
    queryKey: ['control-sheet', 'periods', startDate, endDate, selectedTeam],
    enabled: canViewControlSheet && !isUserLoading,
    queryFn: async () => {
      const res = await getTeamPeriodsApiV1ApprovalsTeamPeriodsGet({
        throwOnError: true,
        query: {
          start_date: startDate,
          end_date: endDate,
          org_unit_id: selectedTeam !== 'all' ? Number(selectedTeam) : undefined,
        },
      })
      return (Array.isArray(res.data) ? res.data : []) as PeriodRow[]
    },
  })

  const employeesQuery = useQuery({
    queryKey: ['control-sheet', 'employees', selectedTeam, role],
    enabled: canViewControlSheet && !isUserLoading,
    queryFn: async () => {
      const res = await getEmployeesApiV1OrgEmployeesGet({
        throwOnError: true,
        query: {
          page: 1,
          size: 1000,
          org_unit_id: selectedTeam !== 'all' ? Number(selectedTeam) : undefined,
        },
      })
      const payload = res.data as { items?: EmployeeRecord[] }
      const items = Array.isArray(payload?.items) ? payload.items : []
      if (selectedTeam === 'all' && !isAdminRole) {
        return items.filter((item) => item.org_unit_id !== null && teamIds.has(item.org_unit_id))
      }
      return items
    },
  })

  const updateStatusMutation = useMutation({
    mutationFn: async (args: { periodId: number; status: string; comment?: string }) => {
      await approvePeriodApiV1ApprovalsPeriodIdApprovePost({
        throwOnError: true,
        path: { period_id: args.periodId },
        body: { status: args.status, comment: args.comment },
      })
    },
    onSuccess: () => {
      toast.success(t('web.control_sheet.status_updated'))
      queryClient.invalidateQueries({ queryKey: ['control-sheet', 'periods'] })
      setStatusDialogOpen(false)
      setStatusTarget(null)
      setStatusComment('')
    },
    onError: (error) => {
      const message = error instanceof Error ? error.message : t('web.control_sheet.status_update_failed')
      toast.error(message)
    },
  })

  const summaries = useMemo(() => {
    const logs = dashboardQuery.data ?? []
    const periods = periodsQuery.data ?? []
    const employees = employeesQuery.data ?? []

    const periodByUserId = new Map<number, PeriodRow>()
    for (const period of periods) {
      periodByUserId.set(period.user_id, period)
    }

    const summaryMap = new Map<string, EmployeeSummary & { taskMap: Map<string, TaskSummary> }>()
    const keyByUserId = new Map<number, string>()
    const keyByName = new Map<string, string>()

    const makeDayHours = () =>
      Object.fromEntries(weekColumns.map((col) => [col.date, 0])) as Record<string, number>

    const registerKeyRefs = (key: string, userId: number | null, name: string) => {
      if (typeof userId === 'number') {
        keyByUserId.set(userId, key)
      }
      const n = normalizeName(name)
      if (n) {
        keyByName.set(n, key)
      }
    }

    const resolveKey = (userId: number | null, name: string) => {
      if (typeof userId === 'number') {
        const byUser = keyByUserId.get(userId)
        if (byUser) return byUser
      }

      const normalized = normalizeName(name)
      const byName = keyByName.get(normalized)
      if (byName) return byName

      const base = typeof userId === 'number' ? `u-${userId}` : `n-${normalized || 'unknown'}`
      let unique = base
      let idx = 2
      while (summaryMap.has(unique)) {
        unique = `${base}-${idx}`
        idx += 1
      }
      return unique
    }

    for (const employee of employees) {
      const userId = employee.user_id
      const key = resolveKey(userId, employee.display_name)
      const period = typeof userId === 'number' ? periodByUserId.get(userId) : undefined
      const team =
        employee.org_unit_id !== null
          ? teamNameById.get(employee.org_unit_id) ?? t('web.control_sheet.team_id', { id: employee.org_unit_id })
          : t('common.na')

      const existing = summaryMap.get(key)
      if (existing) {
        if (typeof userId === 'number' && existing.userId === null) {
          existing.userId = userId
        }
        if (existing.team === t('common.na') && team !== t('common.na')) {
          existing.team = team
          existing.teamId = employee.org_unit_id
        }
        if (period && existing.periodId === null) {
          existing.periodId = period.id
          existing.status = normalizeStatus(period.status)
          existing.periodComment = period.comment ?? null
        }
      } else {
        summaryMap.set(key, {
          key,
          userId,
          name: employee.display_name,
          team,
          teamId: employee.org_unit_id,
          status: normalizeStatus(period?.status ?? 'OPEN'),
          periodId: period?.id ?? null,
          periodComment: period?.comment ?? null,
          dayHours: makeDayHours(),
          total: 0,
          tasks: [],
          taskMap: new Map<string, TaskSummary>(),
        })
      }

      registerKeyRefs(key, userId, employee.display_name)
    }

    for (const row of logs) {
      // Secondary filter to ensure team membership if a specific team is selected
      if (selectedTeam !== 'all' && row['OrgUnit ID'] !== null && row['OrgUnit ID'] !== Number(selectedTeam)) {
        continue
      }

      const userId = typeof row['User ID'] === 'number' ? row['User ID'] : null
      const key = resolveKey(userId, row.User)
      const period = typeof userId === 'number' ? periodByUserId.get(userId) : undefined

      let summary = summaryMap.get(key)
      if (!summary) {
        // Only add from logs if we are in "all" mode OR the log matches the team
        summary = {
          key,
          userId,
          name: row.User,
          team: row.OrgUnit || t('common.na'),
          teamId: row['OrgUnit ID'],
          status: normalizeStatus(period?.status ?? 'OPEN'),
          periodId: period?.id ?? null,
          periodComment: period?.comment ?? null,
          dayHours: makeDayHours(),
          total: 0,
          tasks: [],
          taskMap: new Map<string, TaskSummary>(),
        }
        summaryMap.set(key, summary)
      } else {
        if (typeof userId === 'number' && summary.userId === null) {
          summary.userId = userId
        }
        if (summary.team === t('common.na') && row.OrgUnit) {
          summary.team = row.OrgUnit
          summary.teamId = row['OrgUnit ID']
        }
        if (period && summary.periodId === null) {
          summary.periodId = period.id
          summary.status = normalizeStatus(period.status)
          summary.periodComment = period.comment ?? null
        }
      }
      registerKeyRefs(key, userId, row.User)

      const dateKey = row.Date
      const hours = Number(row.Hours) || 0

      if (summary.dayHours[dateKey] !== undefined) {
        summary.dayHours[dateKey] += hours
      }
      summary.total += hours

      const taskName = taskTitle(row, t('web.control_sheet.manual_worklog'))
      if (!summary.taskMap.has(taskName)) {
        summary.taskMap.set(taskName, {
          name: taskName,
          dayHours: Object.fromEntries(weekColumns.map((col) => [col.date, 0])) as Record<string, number>,
          total: 0,
        })
      }

      const task = summary.taskMap.get(taskName)
      if (task) {
        if (task.dayHours[dateKey] !== undefined) {
          task.dayHours[dateKey] += hours
        }
        task.total += hours
      }
    }

    return Array.from(summaryMap.values())
      .map((summary) => ({
        ...summary,
        tasks: Array.from(summary.taskMap.values()).sort((a, b) => a.name.localeCompare(b.name)),
      }))
      .sort((a, b) => a.name.localeCompare(b.name))
  }, [dashboardQuery.data, periodsQuery.data, employeesQuery.data, weekColumns, teamNameById, t, selectedTeam])

  const paginatedSummaries = useMemo(() => {
    const start = (page - 1) * pageSize
    return summaries.slice(start, start + pageSize)
  }, [summaries, page, pageSize])

  const isLoading =
    isUserLoading || teamsQuery.isLoading || dashboardQuery.isLoading || periodsQuery.isLoading || employeesQuery.isLoading

  const hasError =
    teamsQuery.isError || dashboardQuery.isError || periodsQuery.isError || employeesQuery.isError

  const openStatusDialog = (employee: EmployeeSummary) => {
    setStatusTarget(employee)
    setStatusDraft(employee.status)
    setStatusComment(employee.periodComment ?? '')
    setStatusDialogOpen(true)
  }

  const applyStatusChange = async () => {
    if (!statusTarget?.periodId) return
    await updateStatusMutation.mutateAsync({
      periodId: statusTarget.periodId,
      status: statusDraft,
      comment: statusComment.trim() ? statusComment.trim() : undefined,
    })
  }

  if (!isUserLoading && !canViewControlSheet) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-destructive">
            <ShieldAlert className="size-5" />
            {t('web.control_sheet.access_denied')}
          </CardTitle>
          <CardDescription>
            {t('web.control_sheet.access_denied_desc')}
          </CardDescription>
        </CardHeader>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">{t('web.control_sheet.title')}</h1>
        <p className="text-muted-foreground">
          {t('web.control_sheet.subtitle')}
        </p>
      </div>

      <CollapsibleFilterBlock title={t('web.control_sheet.filters')} defaultOpen>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="control-sheet-week">{t('web.control_sheet.week')}</Label>
            <Input
              id="control-sheet-week"
              type="date"
              value={format(weekAnchor, 'yyyy-MM-dd')}
              onChange={(event) => {
                if (!event.target.value) return
                setWeekAnchor(parseISO(event.target.value))
              }}
            />
            <p className="text-xs text-muted-foreground">
              {t('web.control_sheet.period')}: {format(weekStart, 'dd.MM.yyyy')} - {format(weekEnd, 'dd.MM.yyyy')}
            </p>
          </div>

          <div className="space-y-2">
            <Label>{t('common.team')}</Label>
            <Select value={selectedTeam} onValueChange={setSelectedTeam}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder={t('web.control_sheet.select_team')} />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectItem value="all">
                    {isAdminRole ? t('approvals.all_teams') : t('approvals.all_my_teams')}
                  </SelectItem>
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
      </CollapsibleFilterBlock>

      {isLoading ? (
        <div className="flex h-64 items-center justify-center rounded-lg border bg-muted/10">
          <Loader2 className="size-8 animate-spin text-muted-foreground" />
        </div>
      ) : hasError ? (
        <Card>
          <CardHeader>
            <CardTitle>{t('web.control_sheet.error_loading')}</CardTitle>
            <CardDescription>
              {t('web.control_sheet.error_loading_desc')}
            </CardDescription>
          </CardHeader>
        </Card>
      ) : summaries.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TableProperties className="size-5" />
              {t('web.control_sheet.no_data_week')}
            </CardTitle>
            <CardDescription>{t('web.control_sheet.try_change_week_team')}</CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="size-5" />
                {t('web.control_sheet.team_summary')}
              </CardTitle>
              <CardDescription>
                {t('web.control_sheet.team_summary_desc')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <PivotTable
                model={{
                  rowDimensions: ['employee', 'status'],
                  headerRows: [weekColumns.map(col => ({ label: col.label, colSpan: 1 }))],
                  bodyRows: summaries.map(employee => ({
                    rowValues: [employee.name, employee.status],
                    values: weekColumns.map(col => employee.dayHours[col.date] ?? 0),
                    originalData: employee
                  }))
                }}
                renderRowValue={(value, dimension) => {
                  if (dimension === 'status') {
                    return (
                      <Badge variant="outline" className={cn("w-fit", statusClass(value))}>
                        {statusLabel(t, value)}
                      </Badge>
                    )
                  }
                  return <span className="font-medium">{value}</span>
                }}
                showTotals={true}
                maxHeight="40vh"
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserRound className="size-5" />
                {t('web.control_sheet.employee_summary')} ({summaries.length})
              </CardTitle>
              <CardDescription>
                {t('web.control_sheet.employee_summary_desc')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <CardList
                items={paginatedSummaries}
                showPagination={true}
                total={summaries.length}
                page={page}
                pageSize={pageSize}
                onPageChange={setPage}
                itemLabel={t('common.employees').toLowerCase()}
                renderItem={(employee) => (
                  <CollapsibleBlock
                    key={employee.key}
                    title={`${employee.name} (${employee.total.toFixed(1)} ${t('common.hours_short')})`}
                    defaultOpen={false}
                  >
                    <div className="flex flex-col gap-3 rounded-lg border p-4 md:flex-row md:items-center md:justify-between mb-4">
                      <div className="space-y-1">
                        <h3 className="text-lg font-semibold">{employee.name}</h3>
                        <p className="text-sm text-muted-foreground">{t('common.team')}: {employee.team}</p>
                        <p className="text-sm text-muted-foreground">
                          {t('web.control_sheet.total_hours_week')}: <span className="font-semibold text-foreground">{employee.total.toFixed(1)}</span>
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className={statusClass(employee.status)}>
                          {statusLabel(t, employee.status)}
                        </Badge>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openStatusDialog(employee)}
                        >
                          <MessageSquareText className="mr-2 size-4" />
                          {t('web.control_sheet.change_status')}
                        </Button>
                      </div>
                    </div>

                    <PivotTable
                      model={{
                        rowDimensions: ['task'],
                        headerRows: [weekColumns.map(col => ({ label: col.label, colSpan: 1 }))],
                        bodyRows: employee.tasks.map(task => ({
                          rowValues: [task.name],
                          values: weekColumns.map(col => task.dayHours[col.date] ?? 0),
                        }))
                      }}
                      showTotals={true}
                      maxHeight="40vh"
                    />
                  </CollapsibleBlock>
                )}
              />
            </CardContent>
          </Card>
        </>
      )}

      <Dialog open={statusDialogOpen} onOpenChange={setStatusDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t('web.control_sheet.dialog_title')}</DialogTitle>
            <DialogDescription>
              {statusTarget
                ? t('web.control_sheet.dialog_desc_with_employee', { name: statusTarget.name })
                : t('web.control_sheet.dialog_desc')}
              {statusTarget && !statusTarget.periodId ? ` ${t('web.control_sheet.period_not_initiated')}` : ''}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <div className="space-y-2">
              <Label>{t('web.control_sheet.new_status')}</Label>
              <Select value={statusDraft} onValueChange={setStatusDraft}>
                <SelectTrigger>
                  <SelectValue placeholder={t('web.control_sheet.select_status')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="OPEN">{statusLabel(t, 'OPEN')}</SelectItem>
                  <SelectItem value="SUBMITTED">{statusLabel(t, 'SUBMITTED')}</SelectItem>
                  <SelectItem value="APPROVED">{statusLabel(t, 'APPROVED')}</SelectItem>
                  <SelectItem value="REJECTED">{statusLabel(t, 'REJECTED')}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="status-comment">{t('common.comment')}</Label>
              <Textarea
                id="status-comment"
                placeholder={t('web.control_sheet.comment_placeholder')}
                value={statusComment}
                onChange={(event) => setStatusComment(event.target.value)}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setStatusDialogOpen(false)}>
              {t('common.cancel')}
            </Button>
            <Button
              onClick={() => {
                void applyStatusChange()
              }}
              disabled={!statusTarget?.periodId || updateStatusMutation.isPending}
            >
              {updateStatusMutation.isPending ? t('web.control_sheet.saving') : t('common.save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
