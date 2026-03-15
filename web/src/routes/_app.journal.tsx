import { createRoute } from '@tanstack/react-router'
import { appLayoutRoute } from './_app'
import { queryClient } from '@/lib/query-client'
import { timesheetKeys } from '@/features/timesheet/hooks'
import { getAllWorklogsApiV1TimesheetGet } from '@/api/generated/sdk.gen'

export const journalRoute = createRoute({
  path: 'journal',
  getParentRoute: () => appLayoutRoute,
  loader: () =>
    queryClient.prefetchQuery({
      queryKey: timesheetKeys.entries(),
      queryFn: () => getAllWorklogsApiV1TimesheetGet().then((r) => r.data),
    }).catch(() => null),
  component: () => (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Journal</h1>
      <p className="text-muted-foreground">Time journal placeholder — Phase 6</p>
    </div>
  ),
})
