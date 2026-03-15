import { createRoute } from '@tanstack/react-router'
import { reportsRoute } from './_app.reports'
import { queryClient } from '@/lib/query-client'
import { reportsKeys } from '@/features/reports/hooks'
import { getDashboardDataApiV1ReportsDashboardGet } from '@/api/generated/sdk.gen'

export const reportsCapexRoute = createRoute({
  path: 'capex',
  getParentRoute: () => reportsRoute,
  loader: () =>
    queryClient.prefetchQuery({
      queryKey: reportsKeys.capex(),
      queryFn: () => getDashboardDataApiV1ReportsDashboardGet().then((r) => r.data),
    }).catch(() => null),
  component: () => (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">CapEx Report</h2>
      <p className="text-muted-foreground">Capital expenditure report placeholder — Phase 6</p>
    </div>
  ),
})
