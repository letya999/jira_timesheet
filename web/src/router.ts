import { createRouter } from '@tanstack/react-router'

import { rootRoute } from './routes/__root.tsx'
import { notFoundRoute } from './routes/not-found.tsx'
import { badGatewayRoute } from './routes/bad-gateway.tsx'
import { authLayoutRoute } from './routes/_auth.tsx'
import { loginRoute } from './routes/_auth.login.tsx'
import { appLayoutRoute } from './routes/_app.tsx'
import { dashboardRoute } from './routes/_app.dashboard.tsx'
import { journalRoute } from './routes/_app.journal.tsx'
import { myTimesheetRoute } from './routes/_app.my-timesheet.tsx'
import { orgRoute } from './routes/_app.org.tsx'
import { employeesRoute } from './routes/_app.employees.tsx'
import { employeeDetailRoute } from './routes/_app.employees.$id.tsx'
import { projectsRoute } from './routes/_app.projects.tsx'
import { projectDetailRoute } from './routes/_app.projects.$id.tsx'
import { reportsRoute } from './routes/_app.reports.tsx'
import { reportsIndexRoute } from './routes/_app.reports.index.tsx'
import { reportsCapexRoute } from './routes/_app.reports.capex.tsx'
import { reportsOpexRoute } from './routes/_app.reports.opex.tsx'
import { approvalsRoute } from './routes/_app.approvals.tsx'
import { controlSheetRoute } from './routes/_app.control-sheet.tsx'
import { leaveRoute } from './routes/_app.leave.tsx'
import { notificationsRoute } from './routes/_app.notifications.tsx'
import { settingsRoute } from './routes/_app.settings.tsx'
import { hrRoute } from './routes/_app.hr.tsx'
import { aiChatRoute } from './routes/_app.ai-chat.tsx'

const routeTree = rootRoute.addChildren([
  notFoundRoute,
  badGatewayRoute,
  authLayoutRoute.addChildren([loginRoute]),
  appLayoutRoute.addChildren([
    dashboardRoute,
    journalRoute,
    myTimesheetRoute,
    orgRoute,
    employeesRoute,
    employeeDetailRoute,
    projectsRoute,
    projectDetailRoute,
    reportsRoute.addChildren([reportsIndexRoute, reportsCapexRoute, reportsOpexRoute]),
    approvalsRoute,
    controlSheetRoute,
    leaveRoute,
    notificationsRoute,
    settingsRoute,
    hrRoute,
    aiChatRoute,
  ]),
])

export const router = createRouter({ routeTree })

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}
