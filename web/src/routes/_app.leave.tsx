import { createRoute, lazyRouteComponent } from '@tanstack/react-router'
import { appLayoutRoute } from './_app'
import { queryClient } from '@/lib/query-client'
import { leaveKeys } from '@/features/leave/hooks'
import { getMyLeaveRequestsApiV1LeavesMyGet } from '@/api/generated/sdk.gen'

export const leaveRoute = createRoute({
  path: 'leave',
  getParentRoute: () => appLayoutRoute,
  loader: () =>
    queryClient
      .prefetchQuery({
        queryKey: leaveKeys.my(),
        queryFn: () => getMyLeaveRequestsApiV1LeavesMyGet().then((r) => r.data),
      })
      .catch(() => null),
  component: lazyRouteComponent(() => import('@/features/leave/pages/leave-page')),
})
