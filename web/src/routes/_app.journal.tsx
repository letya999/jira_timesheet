import { useState } from 'react'
import { createRoute } from '@tanstack/react-router'
import { format, startOfMonth } from 'date-fns'
import type { DateRange } from 'react-day-picker'
import type { ColumnDef } from '@tanstack/react-table'
import { appLayoutRoute } from './_app'
import { queryClient } from '@/lib/query-client'
import { timesheetKeys, useTimesheetEntries } from '@/features/timesheet/hooks'
import { getAllWorklogsApiV1TimesheetGet } from '@/api/generated/sdk.gen'
import type { WorklogResponse } from '@/api/generated/types.gen'
import { DataTableOrganism } from '@/components/shared/data-table-organism'
import { DateRangePickerTZ } from '@/components/shared/date-range-picker-tz'
import { JiraKeyLink } from '@/components/jira/jira-key-link'
import { StatusBadge } from '@/components/ui/status-badge'

const FMT = 'yyyy-MM-dd'
const today = new Date()

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

const journalColumns: ColumnDef<WorklogResponse>[] = [
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
    cell: ({ row }) => {
      const { issue_key, issue_summary } = row.original
      if (issue_key) return <JiraKeyLink issueKey={issue_key} />
      return (
        <span className="text-muted-foreground text-sm">
          {issue_summary ?? '—'}
        </span>
      )
    },
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
  {
    accessorKey: 'category_name',
    header: 'Category',
    cell: ({ getValue }) => getValue<string | null>() ?? '—',
  },
]

function JournalPage() {
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: startOfMonth(today),
    to: today,
  })

  const start_date = dateRange?.from ? format(dateRange.from, FMT) : undefined
  const end_date = dateRange?.to ? format(dateRange.to, FMT) : undefined

  const { data } = useTimesheetEntries(
    start_date && end_date ? { start_date, end_date } : undefined,
  )

  const items: WorklogResponse[] = data?.items ?? []
  const total = data?.total ?? 0

  const handleRangeChange = (range: DateRange | undefined) => {
    setDateRange(range)
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Journal</h1>

      <div className="flex items-center gap-4 flex-wrap">
        <DateRangePickerTZ
          value={dateRange}
          onChange={handleRangeChange}
        />
      </div>

      <DataTableOrganism
        columns={journalColumns}
        data={items}
        total={total}
      />
    </div>
  )
}

export const journalRoute = createRoute({
  path: 'journal',
  getParentRoute: () => appLayoutRoute,
  loader: () =>
    queryClient
      .prefetchQuery({
        queryKey: timesheetKeys.entries(),
        queryFn: () => getAllWorklogsApiV1TimesheetGet({}).then((r) => r.data),
      })
      .catch(() => null),
  component: JournalPage,
})
