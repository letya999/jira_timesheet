import { createRoute, redirect } from '@tanstack/react-router'
import { appLayoutRoute } from './_app'
import { queryClient } from '@/lib/query-client'
import { usersKeys } from '@/features/users/hooks'
import { getUsersApiV1UsersGet } from '@/api/generated/sdk.gen'
import { useAuthStore } from '@/stores/auth-store'

export const hrRoute = createRoute({
  path: 'hr',
  getParentRoute: () => appLayoutRoute,
  beforeLoad: () => {
    const { permissions } = useAuthStore.getState()
    if (!permissions.includes('hr:read')) {
      throw redirect({ to: '/app/dashboard' })
    }
  },
  loader: () =>
    queryClient.prefetchQuery({
      queryKey: usersKeys.list(),
      queryFn: () => getUsersApiV1UsersGet().then((r) => r.data),
    }).catch(() => null),
  component: () => (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">HR Administration</h1>
      <p className="text-muted-foreground">HR management placeholder — Phase 6</p>
    </div>
  ),
})
