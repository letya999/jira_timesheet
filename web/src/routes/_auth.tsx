import { createRoute, redirect } from '@tanstack/react-router'
import { rootRoute } from './__root'
import { AuthLayout } from '@/layouts/auth-layout'
import { useAuthStore } from '@/stores/auth-store'

export const authLayoutRoute = createRoute({
  id: '_auth',
  getParentRoute: () => rootRoute,
  component: AuthLayout,
  beforeLoad: () => {
    if (useAuthStore.getState().isAuthenticated) {
      throw redirect({ to: '/app/dashboard' })
    }
  },
})
