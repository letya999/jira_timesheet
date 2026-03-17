import { createRoute, lazyRouteComponent } from '@tanstack/react-router'
import { rootRoute } from './__root'

export const logTimeRoute = createRoute({
  path: '/log-time',
  getParentRoute: () => rootRoute,
  component: lazyRouteComponent(() => import('@/features/timesheet/pages/log-time-page')),
})
