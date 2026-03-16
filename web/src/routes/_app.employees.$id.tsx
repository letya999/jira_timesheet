import { createRoute } from '@tanstack/react-router'
import { appLayoutRoute } from './_app'
import { EmployeeDetailPlaceholder } from './employee-detail-placeholder'

export const employeeDetailRoute = createRoute({
  path: 'employees/$id',
  getParentRoute: () => appLayoutRoute,
  component: EmployeeDetailPlaceholder,
})
