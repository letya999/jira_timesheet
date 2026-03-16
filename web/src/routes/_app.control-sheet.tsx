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
import { toast } from 'sonner'
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

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
  status: string
  periodId: number | null
  periodComment: string | null
  dayHours: Record<string, number>
  total: number
  tasks: TaskSummary[]
}

const RU_WEEKDAYS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс']

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

function taskTitle(row: DashboardRow) {
  const issueKey = row['Issue Key']?.trim()
  const task = row.Task?.trim()
  const description = row.Description?.trim()

  if (issueKey && issueKey !== 'N/A') {
    return task ? `${issueKey} ${task}` : issueKey
  }

  if (description) return description
  if (task) return task
  return 'Manual worklog'
}

function ControlSheet() {
  const queryClient = useQueryClient()
  const { data: currentUser, isLoading: isUserLoading } = useCurrentUser()

  const [weekAnchor, setWeekAnchor] = useState(() => dateUtils.now())
  const [selectedTeam, setSelectedTeam] = useState<string>('all')
  const [statusDialogOpen, setStatusDialogOpen] = useState(false)
  const [statusTarget, setStatusTarget] = useState<EmployeeSummary | null>(null)
  const [statusDraft, setStatusDraft] = useState<string>('APPROVED')
  const [statusComment, setStatusComment] = useState<string>('')

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
          label: `${RU_WEEKDAYS[index]} ${format(day, 'dd')}`,
        }
      }),
    [weekStart],
  )

  const startDate = format(weekStart, 'yyyy-MM-dd')
  const endDate = format(weekEnd, 'yyyy-MM-dd')

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
      toast.success('Статус обновлен')
      queryClient.invalidateQueries({ queryKey: ['control-sheet', 'periods'] })
      setStatusDialogOpen(false)
      setStatusTarget(null)
      setStatusComment('')
    },
    onError: (error) => {
      const message = error instanceof Error ? error.message : 'Не удалось обновить статус'
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
          ? teamNameById.get(employee.org_unit_id) ?? `Team #${employee.org_unit_id}`
          : 'N/A'

      const existing = summaryMap.get(key)
      if (existing) {
        if (typeof userId === 'number' && existing.userId === null) {
          existing.userId = userId
        }
        if (existing.team === 'N/A' && team !== 'N/A') {
          existing.team = team
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
      const userId = typeof row['User ID'] === 'number' ? row['User ID'] : null
      const key = resolveKey(userId, row.User)
      const period = typeof userId === 'number' ? periodByUserId.get(userId) : undefined

      let summary = summaryMap.get(key)
      if (!summary) {
        summary = {
          key,
          userId,
          name: row.User,
          team: row.OrgUnit || 'N/A',
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
        if (summary.team === 'N/A' && row.OrgUnit) {
          summary.team = row.OrgUnit
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

      const taskName = taskTitle(row)
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
  }, [dashboardQuery.data, periodsQuery.data, employeesQuery.data, weekColumns, teamNameById])

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
            Нет доступа
          </CardTitle>
          <CardDescription>
            Страница доступна только для ролей Admin, CEO, PM/Manager.
          </CardDescription>
        </CardHeader>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">Control Sheet</h1>
        <p className="text-muted-foreground">
          Недельный контроль по командам: сводка команды и детальная сводка сотрудников.
        </p>
      </div>

      <CollapsibleFilterBlock title="Фильтры Control Sheet" defaultOpen>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="control-sheet-week">Неделя</Label>
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
              Период: {format(weekStart, 'dd.MM.yyyy')} - {format(weekEnd, 'dd.MM.yyyy')}
            </p>
          </div>

          <div className="space-y-2">
            <Label>Команда</Label>
            <Select value={selectedTeam} onValueChange={setSelectedTeam}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Выберите команду" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectItem value="all">
                    {isAdminRole ? 'Все команды' : 'Все мои команды'}
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
            <CardTitle>Ошибка загрузки данных</CardTitle>
            <CardDescription>
              Не удалось получить данные control sheet. Проверьте соединение и права доступа.
            </CardDescription>
          </CardHeader>
        </Card>
      ) : summaries.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TableProperties className="size-5" />
              Нет данных за выбранную неделю
            </CardTitle>
            <CardDescription>Попробуйте изменить неделю или команду.</CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="size-5" />
                Сводка команды
              </CardTitle>
              <CardDescription>
                Недельная матрица по сотрудникам с итогом часов и статусом периода.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="max-h-[60vh] overflow-auto rounded-md border border-border">
              <Table className="border-collapse [&_th]:font-semibold">
                <TableHeader>
                  <TableRow>
                    <TableHead className="sticky top-0 z-10 border border-border bg-background">Сотрудник</TableHead>
                    {weekColumns.map((col) => (
                      <TableHead key={col.date} className="sticky top-0 z-10 border border-border bg-background text-right">
                        {col.label}
                      </TableHead>
                    ))}
                    <TableHead className="sticky top-0 z-10 border border-border bg-background text-right">Всего</TableHead>
                    <TableHead className="sticky top-0 z-10 border border-border bg-background">Статус</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {summaries.map((employee) => (
                    <TableRow key={employee.key}>
                      <TableCell className="border border-border font-medium">{employee.name}</TableCell>
                      {weekColumns.map((col) => (
                        <TableCell key={col.date} className="border border-border text-right tabular-nums">
                          {employee.dayHours[col.date]?.toFixed(1) ?? '0.0'}
                        </TableCell>
                      ))}
                      <TableCell className="border border-border text-right font-semibold tabular-nums">
                        {employee.total.toFixed(1)}
                      </TableCell>
                      <TableCell className="border border-border">
                        <Badge variant="outline" className={statusClass(employee.status)}>
                          {employee.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserRound className="size-5" />
                Сводка сотрудников
              </CardTitle>
              <CardDescription>
                Отдельный лист на каждого сотрудника: статус недели и раскладка по задачам/дням.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {summaries.map((employee, index) => (
                  <CollapsibleBlock
                    key={employee.key}
                    title={`${employee.name} (${employee.total.toFixed(1)} ч)`}
                    defaultOpen={index === 0}
                  >
                    <div className="flex flex-col gap-3 rounded-lg border p-4 md:flex-row md:items-center md:justify-between">
                      <div className="space-y-1">
                        <h3 className="text-lg font-semibold">{employee.name}</h3>
                        <p className="text-sm text-muted-foreground">Команда: {employee.team}</p>
                        <p className="text-sm text-muted-foreground">
                          Всего часов за неделю: <span className="font-semibold text-foreground">{employee.total.toFixed(1)}</span>
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className={statusClass(employee.status)}>
                          {employee.status}
                        </Badge>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openStatusDialog(employee)}
                        >
                          <MessageSquareText className="mr-2 size-4" />
                          Изменить статус
                        </Button>
                      </div>
                    </div>

                    <div className="max-h-[55vh] overflow-auto rounded-md border border-border">
                    <Table className="border-collapse [&_th]:font-semibold">
                      <TableHeader>
                        <TableRow>
                          <TableHead className="sticky top-0 z-10 border border-border bg-background">Задача / Worklog</TableHead>
                          {weekColumns.map((col) => (
                            <TableHead key={col.date} className="sticky top-0 z-10 border border-border bg-background text-right">
                              {col.label}
                            </TableHead>
                          ))}
                          <TableHead className="sticky top-0 z-10 border border-border bg-background text-right">Всего</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {employee.tasks.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={weekColumns.length + 2} className="border border-border text-muted-foreground">
                              У сотрудника нет worklog-записей за выбранную неделю.
                            </TableCell>
                          </TableRow>
                        ) : (
                          employee.tasks.map((task) => (
                            <TableRow key={task.name}>
                              <TableCell className="max-w-[520px] whitespace-normal border border-border">{task.name}</TableCell>
                              {weekColumns.map((col) => (
                                <TableCell key={col.date} className="border border-border text-right tabular-nums">
                                  {task.dayHours[col.date]?.toFixed(1) ?? '0.0'}
                                </TableCell>
                              ))}
                              <TableCell className="border border-border text-right font-semibold tabular-nums">
                                {task.total.toFixed(1)}
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                    </div>
                  </CollapsibleBlock>
                ))}
              </div>
            </CardContent>
          </Card>
        </>
      )}

      <Dialog open={statusDialogOpen} onOpenChange={setStatusDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Смена статуса периода</DialogTitle>
            <DialogDescription>
              {statusTarget
                ? `Сотрудник: ${statusTarget.name}. Выберите новый статус и добавьте комментарий.`
                : 'Выберите новый статус и добавьте комментарий.'}
              {statusTarget && !statusTarget.periodId ? ' Период за выбранную неделю еще не инициирован.' : ''}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <div className="space-y-2">
              <Label>Новый статус</Label>
              <Select value={statusDraft} onValueChange={setStatusDraft}>
                <SelectTrigger>
                  <SelectValue placeholder="Выберите статус" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="OPEN">OPEN</SelectItem>
                  <SelectItem value="SUBMITTED">SUBMITTED</SelectItem>
                  <SelectItem value="APPROVED">APPROVED</SelectItem>
                  <SelectItem value="REJECTED">REJECTED</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="status-comment">Комментарий</Label>
              <Textarea
                id="status-comment"
                placeholder="Опционально: причина смены статуса"
                value={statusComment}
                onChange={(event) => setStatusComment(event.target.value)}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setStatusDialogOpen(false)}>
              Отмена
            </Button>
            <Button
              onClick={() => {
                void applyStatusChange()
              }}
              disabled={!statusTarget?.periodId || updateStatusMutation.isPending}
            >
              {updateStatusMutation.isPending ? 'Сохранение...' : 'Сохранить'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
