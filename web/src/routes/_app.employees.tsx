import { createRoute } from '@tanstack/react-router'
import { appLayoutRoute } from './_app'
import { queryClient } from '@/lib/query-client'
import { usersKeys } from '@/features/users/hooks'
import { getUsersApiV1UsersGet } from '@/api/generated/sdk.gen'

export const employeesRoute = createRoute({
  path: 'employees',
  getParentRoute: () => appLayoutRoute,
  loader: () =>
    queryClient.prefetchQuery({
      queryKey: usersKeys.list(),
      queryFn: () => getUsersApiV1UsersGet().then((r) => r.data),
    }).catch(() => null),
  component: () => (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Employees</h1>
      <p className="text-muted-foreground">Employee list placeholder — Phase 6</p>
    </div>
  ),
})
