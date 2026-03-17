import { createRoute, lazyRouteComponent } from '@tanstack/react-router'
import { appLayoutRoute } from './_app'
import { queryClient } from '@/lib/query-client'
import { timesheetKeys } from '@/features/timesheet/hooks'
import { getAllWorklogsApiV1TimesheetGet } from '@/api/generated/sdk.gen'
import { subDays } from 'date-fns'
import { dateUtils } from '@/lib/date-utils'
import { useAuthStore } from '@/stores/auth-store'
import { canAccessManagerPages } from '@/lib/rbac'
import { redirect } from '@tanstack/react-router'

const FMT = 'yyyy-MM-dd'

export const journalRoute = createRoute({
  path: 'journal',
  getParentRoute: () => appLayoutRoute,
  beforeLoad: () => {
    const role = (useAuthStore.getState().user as { role?: string } | null)?.role
    if (!canAccessManagerPages(role)) {
      throw redirect({ to: '/app/my-timesheet' })
    }
  },
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
