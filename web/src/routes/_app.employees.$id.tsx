import { createRoute } from '@tanstack/react-router'
import { appLayoutRoute } from './_app'
import { queryClient } from '@/lib/query-client'
import { usersKeys } from '@/features/users/hooks'
import { getUsersApiV1UsersGet } from '@/api/generated/sdk.gen'

export const employeeDetailRoute = createRoute({
  path: 'employees/$id',
  getParentRoute: () => appLayoutRoute,
  loader: ({ params }) =>
    queryClient.prefetchQuery({
      queryKey: usersKeys.detail(Number(params.id)),
      queryFn: () =>
        getUsersApiV1UsersGet({ query: { limit: 1 } }).then((r) => r.data),
    }).catch(() => null),
  component: function EmployeeDetailPage() {
    const { id } = employeeDetailRoute.useParams()
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold">Employee #{id}</h1>
        <p className="text-muted-foreground">Employee detail placeholder — Phase 6</p>
      </div>
    )
  },
})
