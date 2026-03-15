import { useState } from 'react'
import { createRoute } from '@tanstack/react-router'
import {
  format,
  addWeeks,
  addDays,
  startOfWeek,
  endOfWeek,
} from 'date-fns'
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react'
import { appLayoutRoute } from './_app'
import { queryClient } from '@/lib/query-client'
import { timesheetKeys, useMyTimesheetEntries, useCreateEntry } from '@/features/timesheet/hooks'
import { getMyWorklogsApiV1TimesheetWorklogsGet } from '@/api/generated/sdk.gen'
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

function MyTimesheetPage() {
  const [weekOffset, setWeekOffset] = useState(0)
  const [isModalOpen, setIsModalOpen] = useState(false)

  const today = new Date()
  const weekStart = addWeeks(startOfWeek(today, { weekStartsOn: 1 }), weekOffset)
  const weekEnd = addDays(weekStart, 6)

  const weekParams = {
    start_date: format(weekStart, FMT),
    end_date: format(weekEnd, FMT),
  }

  const { data: worklogs, isLoading } = useMyTimesheetEntries(weekParams)
  const createEntry = useCreateEntry()

  const timesheetEntries = mapWorklogsToTimesheetEntries(worklogs ?? [])

  const weekLabel = `${format(weekStart, 'MMM d')} – ${format(weekEnd, 'MMM d, yyyy')}`

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">My Timesheet</h1>
        <Button onClick={() => setIsModalOpen(true)} className="gap-2">
          <Plus className="size-4" />
          Log Time
        </Button>
      </div>

      <div className="flex items-center gap-3">
        <Button
          variant="outline"
          size="icon"
          onClick={() => setWeekOffset((o) => o - 1)}
          aria-label="Previous week"
        >
          <ChevronLeft className="size-4" />
        </Button>
        <span className="text-sm font-medium min-w-[200px] text-center">
          Week of {weekLabel}
        </span>
        <Button
          variant="outline"
          size="icon"
          onClick={() => setWeekOffset((o) => o + 1)}
          aria-label="Next week"
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
            <DialogTitle>Log Time</DialogTitle>
          </DialogHeader>
          <WorklogEntryForm
            isLoading={createEntry.isPending}
            onCancel={() => setIsModalOpen(false)}
            onSubmit={async (values) => {
              await createEntry.mutateAsync({
                date: format(values.date, FMT),
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

export const myTimesheetRoute = createRoute({
  path: 'my-timesheet',
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
  component: MyTimesheetPage,
})
