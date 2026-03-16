import { createRoute, lazyRouteComponent } from '@tanstack/react-router'
import { appLayoutRoute } from './_app'
import { queryClient } from '@/lib/query-client'
import { notificationsKeys } from '@/features/notifications/hooks'
import { getMyNotificationsApiV1NotificationsGet } from '@/api/generated/sdk.gen'

export const notificationsRoute = createRoute({
  path: 'notifications',
  getParentRoute: () => appLayoutRoute,
  loader: () =>
    queryClient
      .prefetchQuery({
        queryKey: notificationsKeys.list(),
        queryFn: () => getMyNotificationsApiV1NotificationsGet().then((r) => r.data),
      })
      .catch(() => null),
  component: lazyRouteComponent(
    () => import('@/features/notifications/pages/notifications-page'),
  ),
})
