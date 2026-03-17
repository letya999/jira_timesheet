import { createRoute, Outlet, redirect } from '@tanstack/react-router'
import { appLayoutRoute } from './_app'
import { useAuthStore } from '@/stores/auth-store'
import { canAccessManagerPages } from '@/lib/rbac'

export const reportsRoute = createRoute({
  path: 'reports',
  getParentRoute: () => appLayoutRoute,
  beforeLoad: () => {
    const role = (useAuthStore.getState().user as { role?: string } | null)?.role
    if (!canAccessManagerPages(role)) {
      throw redirect({ to: '/app/my-timesheet' })
    }
  },
  component: () => <Outlet />,
})
