import { useMemo } from 'react'
import {
  addDays,
  startOfWeek,
  parseISO,
} from 'date-fns'
import { useMyTimesheetEntries } from '@/features/timesheet/hooks'
import type { WorklogResponse } from '@/api/generated/types.gen'
import { PivotTable, type PivotTableModel } from '@/components/shared/pivot-table'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { dateUtils } from '@/lib/date-utils'
import { useTimezone } from '@/hooks/use-timezone'
import { useTranslation } from 'react-i18next'
import { format } from 'date-fns'

const FMT = 'yyyy-MM-dd'

function buildMyTimesheetModel(
  worklogs: WorklogResponse[],
  startDate: Date,
): PivotTableModel {
  const map = new Map<string, { task: string; project: string; values: Record<string, number> }>()
  const days = Array.from({ length: 7 }, (_, i) => format(addDays(startDate, i), FMT))

  for (const log of worklogs) {
    const key = log.issue_key ?? `manual-${log.id}`
    if (!map.has(key)) {
      map.set(key, {
        task: log.issue_summary ?? log.description ?? key,
        project: log.project_name ?? '—',
        values: {},
      })
    }
    const entry = map.get(key)!
    const existing = entry.values[log.date] ?? 0
    entry.values[log.date] = existing + log.hours
  }

  const headerRow = days.map((date) => ({
    label: format(parseISO(date), 'EEE MMM d'),
    colSpan: 1,
  }))

  const bodyRows = Array.from(map.entries()).map(([id, data]) => ({
    id,
    rowValues: [data.task, data.project],
    values: days.map((date) => data.values[date] || 0),
  }))

  return {
    rowDimensions: ['task', 'project'],
    headerRows: [headerRow],
    bodyRows,
  }
}

export default function MyTimesheetPage() {
  const { t } = useTranslation()
  const { timezone } = useTimezone()

  const weekStart = useMemo(() => {
    const today = dateUtils.now()
    return startOfWeek(today, { weekStartsOn: 1 })
  }, [])
  
  const weekEnd = useMemo(() => addDays(weekStart, 6), [weekStart])

  const weekParams = {
    start_date: dateUtils.formatPlain(weekStart, FMT),
    end_date: dateUtils.formatPlain(weekEnd, FMT),
  }

  const { data: worklogs, isLoading } = useMyTimesheetEntries(weekParams)

  const model = useMemo(() => buildMyTimesheetModel(worklogs ?? [], weekStart), [worklogs, weekStart])

  const weekLabel = `${dateUtils.format(weekStart, 'MMM d', timezone)} - ${dateUtils.format(weekEnd, 'MMM d, yyyy', timezone)}`

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t('timesheet.title')}</h1>
        <Button variant="outline" disabled>
          {t('web.timesheet.current_week_only', { defaultValue: 'Current week only' })}
        </Button>
      </div>

      <div className="flex items-center gap-3">
        <Button
          variant="outline"
          size="icon"
          disabled
          aria-label={t('web.timesheet.previous_week')}
        >
          <span>-</span>
        </Button>
        <span className="text-sm font-medium min-w-[200px] text-center">
          {t('web.timesheet.week_of', { week: weekLabel })}
        </span>
        <Button
          variant="outline"
          size="icon"
          disabled
          aria-label={t('web.timesheet.next_week')}
        >
          <span>+</span>
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-[60px] w-full rounded-md" />
          ))}
        </div>
      ) : (
        <PivotTable
          model={model}
          editable={false}
        />
      )}
    </div>
  )
}
