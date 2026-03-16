import { createRoute, lazyRouteComponent } from '@tanstack/react-router'
import { appLayoutRoute } from './_app'
import { queryClient } from '@/lib/query-client'
import { timesheetKeys } from '@/features/timesheet/hooks'
import { getAllWorklogsApiV1TimesheetGet } from '@/api/generated/sdk.gen'
import { subDays } from 'date-fns'
import { dateUtils } from '@/lib/date-utils'

const FMT = 'yyyy-MM-dd'

export const journalRoute = createRoute({
  path: 'journal',
  getParentRoute: () => appLayoutRoute,
  loader: () => {
    const today = dateUtils.now()
    const ninetyDaysAgo = subDays(today, 90)
    const defaultParams = {
      start_date: dateUtils.formatPlain(ninetyDaysAgo, FMT),
      end_date: dateUtils.formatPlain(today, FMT),
      page: 1,
      size: 25,
      sort_order: 'desc' as const,
    }
    return queryClient
      .prefetchQuery({
        queryKey: timesheetKeys.entries(defaultParams),
        queryFn: () => getAllWorklogsApiV1TimesheetGet({ query: defaultParams }).then((r) => r.data),
      })
      .catch(() => null)
  },
  component: lazyRouteComponent(() => import('@/features/timesheet/pages/journal-page')),
})
