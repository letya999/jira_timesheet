import { createRoute, Outlet } from '@tanstack/react-router'
import { appLayoutRoute } from './_app'

export const reportsRoute = createRoute({
  path: 'reports',
  getParentRoute: () => appLayoutRoute,
  component: () => <Outlet />,
})
