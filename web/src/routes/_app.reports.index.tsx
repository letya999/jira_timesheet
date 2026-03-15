import { createRoute } from '@tanstack/react-router'
import { reportsRoute } from './_app.reports'
import { ReportBuilderPage } from '@/features/reports/pages/report-builder-page'

export const reportsIndexRoute = createRoute({
  path: '/',
  getParentRoute: () => reportsRoute,
  component: ReportBuilderPage,
})
