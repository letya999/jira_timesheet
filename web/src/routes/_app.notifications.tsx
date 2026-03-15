import { createRoute } from '@tanstack/react-router'
import { appLayoutRoute } from './_app'
import { queryClient } from '@/lib/query-client'
import { notificationsKeys } from '@/features/notifications/hooks'
import { getMyNotificationsApiV1NotificationsGet } from '@/api/generated/sdk.gen'

export const notificationsRoute = createRoute({
  path: 'notifications',
  getParentRoute: () => appLayoutRoute,
  loader: () =>
    queryClient.prefetchQuery({
      queryKey: notificationsKeys.list(),
      queryFn: () => getMyNotificationsApiV1NotificationsGet().then((r) => r.data),
    }).catch(() => null),
  component: () => (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Notifications</h1>
      <p className="text-muted-foreground">Notifications list placeholder — Phase 6</p>
    </div>
  ),
})
