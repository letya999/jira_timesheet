import { createRoute } from '@tanstack/react-router'
import { appLayoutRoute } from './_app'
import { queryClient } from '@/lib/query-client'
import { leaveKeys } from '@/features/leave/hooks'
import { getMyLeaveRequestsApiV1LeavesMyGet } from '@/api/generated/sdk.gen'

export const leaveRoute = createRoute({
  path: 'leave',
  getParentRoute: () => appLayoutRoute,
  loader: () =>
    queryClient.prefetchQuery({
      queryKey: leaveKeys.my(),
      queryFn: () => getMyLeaveRequestsApiV1LeavesMyGet().then((r) => r.data),
    }).catch(() => null),
  component: () => (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Leave</h1>
      <p className="text-muted-foreground">Leave management placeholder — Phase 6</p>
    </div>
  ),
})
