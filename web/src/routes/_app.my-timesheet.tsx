import { createRoute, lazyRouteComponent } from '@tanstack/react-router'
import {
  startOfWeek,
  endOfWeek,
} from 'date-fns'
import { appLayoutRoute } from './_app'
import { queryClient } from '@/lib/query-client'
import { timesheetKeys } from '@/features/timesheet/hooks'
import { getMyWorklogsApiV1TimesheetWorklogsGet } from '@/api/generated/sdk.gen'
import { dateUtils } from '@/lib/date-utils'

export const myTimesheetRoute = createRoute({
  path: 'my-timesheet',
  getParentRoute: () => appLayoutRoute,
  loader: () => {
    const now = dateUtils.now()
    const loaderWeekStart = startOfWeek(now, { weekStartsOn: 1 })
    const loaderWeekEnd = endOfWeek(now, { weekStartsOn: 1 })
    const weekQuery = {
      start_date: dateUtils.formatPlain(loaderWeekStart, 'yyyy-MM-dd'),
      end_date: dateUtils.formatPlain(loaderWeekEnd, 'yyyy-MM-dd'),
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
  component: lazyRouteComponent(() => import('@/features/timesheet/pages/my-timesheet-page')),
})
