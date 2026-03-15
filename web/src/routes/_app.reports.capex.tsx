import { createRoute, redirect } from '@tanstack/react-router';
import { reportsRoute } from './_app.reports';
import { useAuthStore } from '@/stores/auth-store';
import { CapexReportPage } from '@/features/reports/pages/capex-report-page';

export const reportsCapexRoute = createRoute({
  path: 'capex',
  getParentRoute: () => reportsRoute,
  beforeLoad: () => {
    const { permissions } = useAuthStore.getState();
    if (!permissions.includes('reports.view')) {
      throw redirect({ to: '/app/dashboard' });
    }
  },
  component: CapexReportPage,
});
