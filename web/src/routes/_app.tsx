import { createRoute, redirect } from '@tanstack/react-router'
import { rootRoute } from './__root'
import { AppLayout } from '@/layouts/app-layout'
import { useAuthStore } from '@/stores/auth-store'
import { ErrorFallback } from '@/components/shared/error-fallback'

export const appLayoutRoute = createRoute({
  path: '/app',
  getParentRoute: () => rootRoute,
  component: AppLayout,
  beforeLoad: () => {
    if (!useAuthStore.getState().isAuthenticated) {
      throw redirect({ to: '/login' })
    }
  },
  errorComponent: ({ error, reset }) => (
    <div className="flex min-h-[60vh] items-center justify-center p-8">
      <ErrorFallback error={error as Error} resetError={reset} className="max-w-md w-full" />
    </div>
  ),
})
