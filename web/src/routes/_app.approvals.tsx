import { createRoute, lazyRouteComponent } from '@tanstack/react-router'
import { appLayoutRoute } from './_app'
import { queryClient } from '@/lib/query-client'
import { approvalsKeys } from '@/features/approvals/hooks'
import { getTeamPeriodsApiV1ApprovalsTeamPeriodsGet } from '@/api/generated/sdk.gen'

import { startOfMonth, endOfMonth, format } from 'date-fns'

export const approvalsRoute = createRoute({
  path: 'approvals',
  getParentRoute: () => appLayoutRoute,
  loader: () => {
    const now = new Date()
    const query = {
      start_date: format(startOfMonth(now), 'yyyy-MM-dd'),
      end_date: format(endOfMonth(now), 'yyyy-MM-dd'),
      status: 'SUBMITTED',
    }
    return queryClient
      .prefetchQuery({
        queryKey: approvalsKeys.teamPeriods(query),
        queryFn: () => getTeamPeriodsApiV1ApprovalsTeamPeriodsGet({ query }).then((r) => r.data),
      })
      .catch(() => null)
  },
  component: lazyRouteComponent(() => import('@/features/approvals/pages/approvals-page')),
})
