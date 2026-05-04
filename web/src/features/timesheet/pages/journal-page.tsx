import { useEffect, useMemo, useState } from 'react'
import { subDays } from 'date-fns'
import { Search } from 'lucide-react'
import { dateUtils } from '@/lib/date-utils'
import type { WorklogResponse } from '@/api/generated/types.gen'
import { JournalWorklogCard } from '@/components/time/journal-worklog-card'
import { Button } from '@/components/ui/button'
import { CardList } from '@/components/shared/card-list'
import { SortOrderControl, type SortOrder } from '@/components/shared/sort-order-control'
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
import {
  Collapsible,
  CollapsibleContent,
} from '@/components/ui/collapsible'
import { FilterToggleButton } from '@/components/shared/filter-toggle-button'
import { Slider } from '@/components/ui/slider'
import { useReportCategories, useReportOrgUnits, useReportProjects } from '@/features/reports/hooks'
import { useTimesheetEntries } from '@/features/timesheet/hooks'
import { useCurrentUser } from '@/features/auth/hooks'
import { useTranslation } from 'react-i18next'
import { getMyTeamsApiV1OrgMyTeamsGet } from '@/api/generated/sdk.gen'
import { isAdminRole, normalizeAppRole } from '@/lib/rbac'
import { useQuery } from '@tanstack/react-query'
import { LogTimeDialog } from '@/features/timesheet/components/log-time-dialog'

const FMT = 'yyyy-MM-dd'
const PAGE_SIZE_OPTIONS = [10, 25, 50, 100] as const

export default function JournalPage() {
  const { t } = useTranslation()
  const today = dateUtils.now()
  const ninetyDaysAgo = subDays(today, 90)
  const { data: currentUser } = useCurrentUser()
  const role = (currentUser as { role?: string } | undefined)?.role
  const isAdmin = isAdminRole(role)
  const isEmployee = normalizeAppRole(role) === 'employee'

  const [startDate, setStartDate] = useState(dateUtils.formatPlain(ninetyDaysAgo, FMT))
  const [endDate, setEndDate] = useState(dateUtils.formatPlain(today, FMT))
  const [teamId, setTeamId] = useState<string>('all')
  const [projectId, setProjectId] = useState<string>('all')
  const [category, setCategory] = useState<string>('all')
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState<number>(25)
  const [isFiltersOpen, setIsFiltersOpen] = useState(true)
  const [isLogTimeDialogOpen, setIsLogTimeDialogOpen] = useState(false)

  const { data: categories } = useReportCategories()
  const { data: allTeams = [] } = useReportOrgUnits({ enabled: isAdmin })
  const myTeamsQuery = useQuery({
    queryKey: ['journal', 'my-teams'],
    enabled: !isAdmin && !isEmployee,
    queryFn: async () => {
      const res = await getMyTeamsApiV1OrgMyTeamsGet({ throwOnError: true })
      return Array.isArray(res.data) ? res.data : []
    },
  })
  const teams = useMemo(() => (isAdmin ? allTeams : (myTeamsQuery.data ?? [])), [allTeams, isAdmin, myTeamsQuery.data])
  const { data: projects } = useReportProjects()

  useEffect(() => {
    if (teamId !== 'all' && !teams.some((team) => String(team.id) === teamId)) {
      setTeamId('all')
    }
  }, [teamId, teams])

  const filterHash = useMemo(
    () => [startDate, endDate, teamId, projectId, category, sortOrder, pageSize].join('|'),
    [startDate, endDate, teamId, projectId, category, sortOrder, pageSize],
  )

  useEffect(() => {
    setPage(1)
  }, [filterHash])

  const queryParams = useMemo(
    () => ({
      start_date: startDate,
      end_date: endDate,
      page,
      size: pageSize,
      sort_order: sortOrder,
      org_unit_id: !isEmployee && teamId !== 'all' ? Number(teamId) : undefined,
      project_id: projectId !== 'all' ? Number(projectId) : undefined,
      category: category !== 'all' ? category : undefined,
    }),
    [startDate, endDate, page, pageSize, sortOrder, teamId, projectId, category, isEmployee],
  )

  const { data, isLoading, isFetching } = useTimesheetEntries(queryParams)
  const worklogs: WorklogResponse[] = data?.items ?? []
  const total = data?.total ?? 0
  const pageSizeIndex = Math.max(0, PAGE_SIZE_OPTIONS.findIndex((v) => v === pageSize))

  return (
    <div className="flex flex-col gap-6">
      <Collapsible open={isFiltersOpen} onOpenChange={setIsFiltersOpen}>
        <div className="flex items-center justify-between gap-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={t('journal.filter_search', 'Search by task key or summary...')}
              className="pl-8 h-10"
              disabled
            />
          </div>
          <div className="flex items-center gap-2">
            <Button onClick={() => setIsLogTimeDialogOpen(true)}>
              {t('web.timesheet.log_time')}
            </Button>
            <FilterToggleButton
              isOpen={isFiltersOpen}
              showLabel={t('employees.show_filters', 'Show Filters')}
              hideLabel={t('employees.hide_filters', 'Hide Filters')}
              onClick={() => setIsFiltersOpen((prev) => !prev)}
            />
          </div>
        </div>
        <CollapsibleContent className="space-y-4 rounded-md border p-4 bg-muted/20">
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
            <div className="flex flex-col gap-5">
              <div className="flex flex-col gap-2">
                <Label htmlFor="start-date">{t('journal.start_date')}</Label>
                <Input
                  id="start-date"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="h-10"
                />
              </div>

              <div className="flex flex-col gap-2">
                <Label htmlFor="end-date">{t('journal.end_date')}</Label>
                <Input
                  id="end-date"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="h-10"
                />
              </div>

              <div className="flex flex-col gap-2">
                <Label>{t('common.project')}</Label>
                <Select value={projectId} onValueChange={setProjectId}>
                  <SelectTrigger className="h-10 w-full">
                    <SelectValue placeholder={t('journal.all_projects')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectItem value="all">{t('journal.all_projects')}</SelectItem>
                      {(projects ?? []).map((project) => (
                        <SelectItem key={project.id} value={String(project.id)}>
                          {project.key} - {project.name}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex flex-col gap-5">
              {!isEmployee ? (
                <div className="flex flex-col gap-2">
                  <Label>{t('common.team')}</Label>
                  <Select value={teamId} onValueChange={setTeamId}>
                    <SelectTrigger className="h-10 w-full">
                      <SelectValue placeholder={t('journal.all_teams')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        <SelectItem value="all">{t('journal.all_teams')}</SelectItem>
                        {(teams ?? []).map((team) => (
                          <SelectItem key={team.id} value={String(team.id)}>
                            {team.name}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </div>
              ) : null}

              <div className="flex flex-col gap-2">
                <Label>{t('common.category')}</Label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger className="h-10 w-full">
                    <SelectValue placeholder={t('common.all')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectItem value="all">{t('common.all')}</SelectItem>
                      {(categories ?? []).map((item) => (
                        <SelectItem key={item.id} value={item.name}>
                          {item.name}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex flex-col gap-5">
              <SortOrderControl value={sortOrder} onChange={setSortOrder} />

              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <Label>{t('journal.logs_per_page')}</Label>
                  <span className="text-sm font-semibold text-primary">{pageSize}</span>
                </div>
                <Slider
                  min={0}
                  max={PAGE_SIZE_OPTIONS.length - 1}
                  step={1}
                  value={[pageSizeIndex]}
                  onValueChange={([idx]) => {
                    const safeIndex = idx ?? 1
                    setPageSize(PAGE_SIZE_OPTIONS[safeIndex] ?? 25)
                  }}
                  className="py-4"
                />
              </div>
            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>

      <CardList
        items={worklogs}
        renderItem={(log) => <JournalWorklogCard log={log} />}
        isLoading={isLoading}
        isFetching={isFetching}
        total={total}
        page={page}
        pageSize={pageSize}
        onPageChange={setPage}
        itemLabel="logs"
        loadingMessage={t('journal.loading_logs')}
        emptyMessage={t('journal.no_logs_found')}
      />

      <LogTimeDialog open={isLogTimeDialogOpen} onOpenChange={setIsLogTimeDialogOpen} />
    </div>
  )
}
