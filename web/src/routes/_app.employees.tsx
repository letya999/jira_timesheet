import { createRoute, lazyRouteComponent } from '@tanstack/react-router';
import { appLayoutRoute } from './_app';

export const employeesRoute = createRoute({
  path: 'employees',
  getParentRoute: () => appLayoutRoute,
  component: lazyRouteComponent(() => import('@/features/employees/pages/employees-page')),
});
