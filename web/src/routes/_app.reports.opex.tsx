import { createRoute, redirect } from '@tanstack/react-router';
import { reportsRoute } from './_app.reports';
import { useAuthStore } from '@/stores/auth-store';
import { OpexReportPage } from '@/features/reports/pages/opex-report-page';

export const reportsOpexRoute = createRoute({
  path: 'opex',
  getParentRoute: () => reportsRoute,
  beforeLoad: () => {
    const { permissions } = useAuthStore.getState();
    if (!permissions.includes('reports.view')) {
      throw redirect({ to: '/app/dashboard' });
    }
  },
  component: OpexReportPage,
});
