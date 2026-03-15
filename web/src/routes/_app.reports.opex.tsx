import { createRoute } from '@tanstack/react-router'
import { reportsRoute } from './_app.reports'
import { queryClient } from '@/lib/query-client'
import { reportsKeys } from '@/features/reports/hooks'
import { getDashboardDataApiV1ReportsDashboardGet } from '@/api/generated/sdk.gen'

export const reportsOpexRoute = createRoute({
  path: 'opex',
  getParentRoute: () => reportsRoute,
  loader: () =>
    queryClient.prefetchQuery({
      queryKey: reportsKeys.opex(),
      queryFn: () => getDashboardDataApiV1ReportsDashboardGet().then((r) => r.data),
    }).catch(() => null),
  component: () => (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">OpEx Report</h2>
      <p className="text-muted-foreground">Operating expenditure report placeholder — Phase 6</p>
    </div>
  ),
})
