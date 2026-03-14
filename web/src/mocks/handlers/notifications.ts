import { http, HttpResponse } from 'msw'

const mockNotifications = [
  {
    id: 1,
    type: 'SUCCESS',
    message: 'Your timesheet for period March 1-15 has been approved.',
    createdAt: new Date(Date.now() - 3600000).toISOString(),
    isRead: false,
  },
  {
    id: 2,
    type: 'WARNING',
    message: 'Your Jira sync failed for project TS. Please check your credentials.',
    createdAt: new Date(Date.now() - 7200000).toISOString(),
    isRead: false,
  }
]

export const notificationsHandlers = [
  http.get('/api/v1/notifications', () => {
    return HttpResponse.json(mockNotifications)
  }),
  http.patch('/api/v1/notifications/:id/read', () => {
    return HttpResponse.json({ success: true })
  })
]
