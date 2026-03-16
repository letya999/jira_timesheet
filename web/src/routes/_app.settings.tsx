import { createRoute, lazyRouteComponent } from '@tanstack/react-router'
import { appLayoutRoute } from './_app'

export const settingsRoute = createRoute({
  path: 'settings',
  getParentRoute: () => appLayoutRoute,
  component: lazyRouteComponent(() => import('@/features/settings/pages/settings-page')),
})
