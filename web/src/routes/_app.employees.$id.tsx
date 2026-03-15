import { createRoute, redirect } from '@tanstack/react-router';
import { appLayoutRoute } from './_app';

export const employeeDetailRoute = createRoute({
  path: 'employees/$id',
  getParentRoute: () => appLayoutRoute,
  beforeLoad: () => {
    throw redirect({ to: '/employees' });
  },
});
