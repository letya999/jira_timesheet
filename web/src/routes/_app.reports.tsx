import { createRoute, Outlet } from '@tanstack/react-router'
import { appLayoutRoute } from './_app'

export const reportsRoute = createRoute({
  path: 'reports',
  getParentRoute: () => appLayoutRoute,
  component: () => (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Reports</h1>
      <Outlet />
    </div>
  ),
})
