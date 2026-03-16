/* eslint-disable react-refresh/only-export-components */
import { useState, useMemo } from 'react'
import { createRoute } from '@tanstack/react-router'
import { appLayoutRoute } from './_app'
import { queryClient } from '@/lib/query-client'
import { timesheetKeys, useTimesheetEntries } from '@/features/timesheet/hooks'
import { getAllWorklogsApiV1TimesheetGet } from '@/api/generated/sdk.gen'
import { TimesheetGrid, type TimesheetEntry } from '@/components/time/timesheet-grid'
import { DateRangePicker } from '@/components/ui/date-range-picker'
import { startOfMonth, endOfMonth } from 'date-fns'
import { Loader2, FileSpreadsheet } from 'lucide-react'
import { dateUtils } from '@/lib/date-utils'

export const controlSheetRoute = createRoute({
  path: 'control-sheet',
  getParentRoute: () => appLayoutRoute,
  loader: () =>
    queryClient.prefetchQuery({
      queryKey: timesheetKeys.entries(),
      queryFn: () => getAllWorklogsApiV1TimesheetGet().then((r) => r.data),
    }).catch(() => null),
  component: ControlSheet,
})

function ControlSheet() {
  const [dateRange, setDateRange] = useState<{ from: Date; to: Date }>(() => {
    const now = dateUtils.now()
    return {
      from: startOfMonth(now),
      to: endOfMonth(now),
    }
  })

  const { data: worklogsData, isLoading } = useTimesheetEntries({
    start_date: dateUtils.formatPlain(dateRange.from, 'yyyy-MM-dd'),
    end_date: dateUtils.formatPlain(dateRange.to, 'yyyy-MM-dd'),
  })

  const gridEntries = useMemo<TimesheetEntry[]>(() => {
    const worklogs = Array.isArray(worklogsData) ? worklogsData : worklogsData?.items || []
    if (worklogs.length === 0) return []

    // Group by issue/task to show in grid
    // Using project_name and issue_key from backend schema
    const grouped = worklogs.reduce((acc: Record<string, any>, log: any) => {
      const key = `${log.issue_key || 'manual'}-${log.project_name || 'other'}`
      if (!acc[key]) {
        acc[key] = {
          id: key,
          taskName: log.issue_summary || log.description || 'Manual Entry',
          projectKey: log.project_name || 'N/A', // Display project name as key in the grid for clarity
          values: {},
        }
      }
      acc[key].values[log.date] = (acc[key].values[log.date] || 0) + log.hours
      return acc
    }, {} as Record<string, TimesheetEntry>)

    return Object.values(grouped) as TimesheetEntry[]
  }, [worklogsData])

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Control Sheet</h1>
          <p className="text-muted-foreground">
            Aggregated team worklogs for the selected period.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <DateRangePicker 
            date={dateRange} 
            setDate={(range) => range?.from && range?.to && setDateRange(range as { from: Date; to: Date })} 
          />
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-64 border rounded-lg bg-muted/10">
          <Loader2 className="size-8 animate-spin text-muted-foreground" />
        </div>
      ) : gridEntries.length > 0 ? (
        <div className="space-y-4">
          <TimesheetGrid 
            startDate={dateRange.from} 
            entries={gridEntries} 
            className="border-none shadow-none"
          />
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center h-64 border rounded-lg bg-muted/30 border-dashed">
          <FileSpreadsheet className="size-12 text-muted-foreground mb-4" />
          <h2 className="text-lg font-semibold">No worklogs found</h2>
          <p className="text-muted-foreground text-sm">
            Try adjusting the date range or filters.
          </p>
        </div>
      )}
    </div>
  )
}
