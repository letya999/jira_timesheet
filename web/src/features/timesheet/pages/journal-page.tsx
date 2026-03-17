import { useEffect, useMemo, useState } from 'react'
import { subDays } from 'date-fns'
import { dateUtils } from '@/lib/date-utils'
import type { WorklogResponse } from '@/api/generated/types.gen'
import { JournalWorklogCard } from '@/components/time/journal-worklog-card'
import { CardList } from '@/components/shared/card-list'
import { CollapsibleFilterBlock } from '@/components/shared/collapsible-filter-block'
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
import { Slider } from '@/components/ui/slider'
import { useReportCategories, useReportOrgUnits, useReportProjects } from '@/features/reports/hooks'
import { useTimesheetEntries } from '@/features/timesheet/hooks'
import { useAuthStore } from '@/stores/auth-store'
import { useTranslation } from 'react-i18next'

const FMT = 'yyyy-MM-dd'
const PAGE_SIZE_OPTIONS = [10, 25, 50, 100] as const

export default function JournalPage() {
  const { t } = useTranslation()
  const today = dateUtils.now()
  const ninetyDaysAgo = subDays(today, 90)
  const { user, permissions } = useAuthStore()
  const isManager = user?.is_admin || permissions.includes('reports.manage') || permissions.includes('org.view')

  const [startDate, setStartDate] = useState(dateUtils.formatPlain(ninetyDaysAgo, FMT))
  const [endDate, setEndDate] = useState(dateUtils.formatPlain(today, FMT))
  const [teamId, setTeamId] = useState<string>('all')
  const [projectId, setProjectId] = useState<string>('all')
  const [category, setCategory] = useState<string>('all')
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState<number>(25)

  const { data: categories } = useReportCategories()
  const { data: teams } = useReportOrgUnits()
  const { data: projects } = useReportProjects()

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
      org_unit_id: teamId !== 'all' ? Number(teamId) : undefined,
      project_id: projectId !== 'all' ? Number(projectId) : undefined,
      category: category !== 'all' ? category : undefined,
    }),
    [startDate, endDate, page, pageSize, sortOrder, teamId, projectId, category],
  )

  const { data, isLoading, isFetching } = useTimesheetEntries(queryParams)
  const worklogs: WorklogResponse[] = data?.items ?? []
  const total = data?.total ?? 0
  const pageSizeIndex = Math.max(0, PAGE_SIZE_OPTIONS.findIndex((v) => v === pageSize))

  return (
    <div className="flex flex-col gap-6">
      <CollapsibleFilterBlock>
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
          <div className="flex flex-col gap-5">
            <div className="flex flex-col gap-2">
              <Label htmlFor="start-date">{t('journal.start_date')}</Label>
              <Input id="start-date" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="end-date">{t('journal.end_date')}</Label>
              <Input id="end-date" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
            </div>

            <div className="flex flex-col gap-2">
              <Label>{t('common.project')}</Label>
              <Select value={projectId} onValueChange={setProjectId}>
                <SelectTrigger className="h-11 w-full">
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
            <div className="flex flex-col gap-2">
              <Label>{t('common.team')}</Label>
              <Select value={teamId} onValueChange={setTeamId} disabled={!isManager}>
                <SelectTrigger className="h-11 w-full">
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
          </div>

          <div className="flex flex-col gap-5">
            <div className="flex flex-col gap-2">
              <Label>{t('common.category')}</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger className="h-11 w-full">
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

            <SortOrderControl value={sortOrder} onChange={setSortOrder} />

            <div className="flex flex-col gap-2">
              <Label>{t('journal.logs_per_page')}</Label>
              <span className="text-sm font-semibold text-primary">{pageSize}</span>
              <Slider
                min={0}
                max={PAGE_SIZE_OPTIONS.length - 1}
                step={1}
                value={[pageSizeIndex]}
                onValueChange={([idx]) => {
                  const safeIndex = idx ?? 1
                  setPageSize(PAGE_SIZE_OPTIONS[safeIndex] ?? 25)
                }}
              />
            </div>
          </div>
        </div>
      </CollapsibleFilterBlock>

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
    </div>
  )
}
