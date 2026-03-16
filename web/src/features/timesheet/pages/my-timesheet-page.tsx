import { useState, useMemo } from 'react'
import {
  addWeeks,
  addDays,
  startOfWeek,
} from 'date-fns'
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react'
import { useMyTimesheetEntries, useCreateEntry } from '@/features/timesheet/hooks'
import type { WorklogResponse } from '@/api/generated/types.gen'
import { TimesheetGrid } from '@/components/time/timesheet-grid'
import type { TimesheetEntry } from '@/components/time/timesheet-grid'
import { WorklogEntryForm } from '@/components/time/worklog-entry-form'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { dateUtils } from '@/lib/date-utils'
import { useTimezone } from '@/hooks/use-timezone'
import { useTranslation } from 'react-i18next'

const FMT = 'yyyy-MM-dd'

function mapWorklogsToTimesheetEntries(
  worklogs: WorklogResponse[],
): TimesheetEntry[] {
  const map = new Map<string, TimesheetEntry>()

  for (const log of worklogs) {
    const key = log.issue_key ?? `manual-${log.id}`
    if (!map.has(key)) {
      map.set(key, {
        id: key,
        taskName: log.issue_summary ?? log.description ?? key,
        projectKey: log.project_name ?? '—',
        values: {},
      })
    }
    const entry = map.get(key)!
    const existing = entry.values[log.date] ?? 0
    entry.values[log.date] = existing + log.hours
  }

  return Array.from(map.values())
}

export default function MyTimesheetPage() {
  const { t } = useTranslation()
  const { timezone } = useTimezone()
  const [weekOffset, setWeekOffset] = useState(0)
  const [isModalOpen, setIsModalOpen] = useState(false)

  const weekStart = useMemo(() => {
    const today = dateUtils.now()
    return addWeeks(startOfWeek(today, { weekStartsOn: 1 }), weekOffset)
  }, [weekOffset])
  
  const weekEnd = useMemo(() => addDays(weekStart, 6), [weekStart])

  const weekParams = {
    start_date: dateUtils.formatPlain(weekStart, FMT),
    end_date: dateUtils.formatPlain(weekEnd, FMT),
  }

  const { data: worklogs, isLoading } = useMyTimesheetEntries(weekParams)
  const createEntry = useCreateEntry()

  const timesheetEntries = mapWorklogsToTimesheetEntries(worklogs ?? [])

  const weekLabel = `${dateUtils.format(weekStart, 'MMM d', timezone)} - ${dateUtils.format(weekEnd, 'MMM d, yyyy', timezone)}`

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t('timesheet.title')}</h1>
        <Button onClick={() => setIsModalOpen(true)} className="gap-2">
          <Plus className="size-4" />
          {t('web.timesheet.log_time')}
        </Button>
      </div>

      <div className="flex items-center gap-3">
        <Button
          variant="outline"
          size="icon"
          onClick={() => setWeekOffset((o) => o - 1)}
          aria-label={t('web.timesheet.previous_week')}
        >
          <ChevronLeft className="size-4" />
        </Button>
        <span className="text-sm font-medium min-w-[200px] text-center">
          {t('web.timesheet.week_of', { week: weekLabel })}
        </span>
        <Button
          variant="outline"
          size="icon"
          onClick={() => setWeekOffset((o) => o + 1)}
          aria-label={t('web.timesheet.next_week')}
        >
          <ChevronRight className="size-4" />
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-[60px] w-full rounded-md" />
          ))}
        </div>
      ) : (
        <TimesheetGrid
          startDate={weekStart}
          entries={timesheetEntries}
          onUpdate={async (id, date, value) => {
            // Optimistic update is handled inside TimesheetGrid;
            // update endpoint not yet available — grid handles revert on throw
            void id
            void date
            void value
          }}
        />
      )}

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{t('web.timesheet.log_time')}</DialogTitle>
          </DialogHeader>
          <WorklogEntryForm
            isLoading={createEntry.isPending}
            onCancel={() => setIsModalOpen(false)}
            onSubmit={async (values) => {
              await createEntry.mutateAsync({
                date: dateUtils.formatPlain(values.date, FMT),
                hours: values.hours,
                description: values.description,
                category: values.activityType,
              })
              setIsModalOpen(false)
            }}
          />
        </DialogContent>
      </Dialog>
    </div>
  )
}
