import { createRoute } from '@tanstack/react-router'
import { appLayoutRoute } from './_app'
import { queryClient } from '@/lib/query-client'
import { approvalsKeys } from '@/features/approvals/hooks'
import { getTeamPeriodsApiV1ApprovalsTeamPeriodsGet } from '@/api/generated/sdk.gen'

export const approvalsRoute = createRoute({
  path: 'approvals',
  getParentRoute: () => appLayoutRoute,
  loader: () =>
    queryClient.prefetchQuery({
      queryKey: approvalsKeys.teamPeriods(),
      queryFn: () => getTeamPeriodsApiV1ApprovalsTeamPeriodsGet().then((r) => r.data),
    }).catch(() => null),
  component: () => (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Approvals</h1>
      <p className="text-muted-foreground">Approval workflow placeholder — Phase 6</p>
    </div>
  ),
})
