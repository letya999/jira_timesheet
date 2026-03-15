import { createRoute } from '@tanstack/react-router'
import { appLayoutRoute } from './_app'
import { queryClient } from '@/lib/query-client'
import { timesheetKeys } from '@/features/timesheet/hooks'
import { getMyWorklogsApiV1TimesheetWorklogsGet } from '@/api/generated/sdk.gen'

export const dashboardRoute = createRoute({
  path: 'dashboard',
  getParentRoute: () => appLayoutRoute,
  loader: () =>
    queryClient.prefetchQuery({
      queryKey: timesheetKeys.myEntries(),
      queryFn: () => getMyWorklogsApiV1TimesheetWorklogsGet().then((r) => r.data),
    }).catch(() => null),
  component: () => (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Dashboard</h1>
      <p className="text-muted-foreground">Overview placeholder — Phase 6</p>
    </div>
  ),
})
