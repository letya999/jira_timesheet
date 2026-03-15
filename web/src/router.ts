import { createRouter } from '@tanstack/react-router'

import { rootRoute } from './routes/__root'
import { authLayoutRoute } from './routes/_auth'
import { loginRoute } from './routes/_auth.login'
import { appLayoutRoute } from './routes/_app'
import { dashboardRoute } from './routes/_app.dashboard'
import { journalRoute } from './routes/_app.journal'
import { myTimesheetRoute } from './routes/_app.my-timesheet'
import { orgRoute } from './routes/_app.org'
import { employeesRoute } from './routes/_app.employees'
import { employeeDetailRoute } from './routes/_app.employees.$id'
import { projectsRoute } from './routes/_app.projects'
import { projectDetailRoute } from './routes/_app.projects.$id'
import { reportsRoute } from './routes/_app.reports'
import { reportsIndexRoute } from './routes/_app.reports.index'
import { reportsCapexRoute } from './routes/_app.reports.capex'
import { reportsOpexRoute } from './routes/_app.reports.opex'
import { approvalsRoute } from './routes/_app.approvals'
import { controlSheetRoute } from './routes/_app.control-sheet'
import { leaveRoute } from './routes/_app.leave'
import { notificationsRoute } from './routes/_app.notifications'
import { settingsRoute } from './routes/_app.settings'
import { hrRoute } from './routes/_app.hr'
import { aiChatRoute } from './routes/_app.ai-chat'

const routeTree = rootRoute.addChildren([
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
