import { http, HttpResponse } from 'msw'
import type { LeaveType, LeaveStatus } from '@/api/generated/types.gen'

const mockLeaveRequests = [
  {
    id: 1,
    userName: 'Jane Smith',
    userEmail: 'jane.smith@example.com',
    type: 'VACATION' as LeaveType,
    status: 'PENDING' as LeaveStatus,
    startDate: '2026-04-01',
    endDate: '2026-04-10',
    reason: 'Annual family trip to Japan.',
  }
]

export const leaveHandlers = [
  http.get('/api/v1/leave-requests', () => {
    return HttpResponse.json(mockLeaveRequests)
  }),
  http.post('/api/v1/leave-requests/:id/approve', () => {
    return HttpResponse.json({ success: true })
  }),
  http.post('/api/v1/leave-requests/:id/reject', () => {
    return HttpResponse.json({ success: true })
  }),
  http.post('/api/v1/leave-requests/:id/cancel', () => {
    return HttpResponse.json({ success: true })
  })
]
