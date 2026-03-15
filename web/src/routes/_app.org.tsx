import { createRoute } from '@tanstack/react-router'
import { appLayoutRoute } from './_app'
import { queryClient } from '@/lib/query-client'
import { orgKeys } from '@/features/org/hooks'
import { getOrgUnitsApiV1OrgUnitsGet } from '@/api/generated/sdk.gen'

export const orgRoute = createRoute({
  path: 'org',
  getParentRoute: () => appLayoutRoute,
  loader: () =>
    queryClient.prefetchQuery({
      queryKey: orgKeys.tree(),
      queryFn: () => getOrgUnitsApiV1OrgUnitsGet().then((r) => r.data),
    }).catch(() => null),
  component: () => (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Organisation</h1>
      <p className="text-muted-foreground">Org chart placeholder — Phase 6</p>
    </div>
  ),
})
