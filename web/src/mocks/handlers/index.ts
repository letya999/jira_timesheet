import { usersHandlers } from './users'
import { projectsHandlers } from './projects'
import { timesheetHandlers } from './timesheet'
import { leaveHandlers } from './leave'
import { approvalsHandlers } from './approvals'
import { notificationsHandlers } from './notifications'
import { syncHandlers } from './sync'
import { orgHandlers } from './org'
import { reportsHandlers } from './reports'

export const handlers = [
  ...usersHandlers,
  ...projectsHandlers,
  ...timesheetHandlers,
  ...leaveHandlers,
  ...approvalsHandlers,
  ...notificationsHandlers,
  ...syncHandlers,
  ...orgHandlers,
  ...reportsHandlers,
]
