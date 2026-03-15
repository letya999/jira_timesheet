import { createRoute } from '@tanstack/react-router';
import { appLayoutRoute } from './_app';
import { EmployeesPage } from '@/features/employees/pages/employees-page';

export const employeesRoute = createRoute({
  path: 'employees',
  getParentRoute: () => appLayoutRoute,
  component: () => <EmployeesPage />,
});
