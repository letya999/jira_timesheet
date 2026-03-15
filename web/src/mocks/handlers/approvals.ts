import { http, HttpResponse } from 'msw'

const mockApprovals = [
  {
    id: 1,
    userName: 'John Doe',
    userEmail: 'john.doe@example.com',
    startDate: '2026-03-01',
    endDate: '2026-03-15',
    totalHours: 120,
    status: 'SUBMITTED',
  }
]

export const approvalsHandlers = [
  http.get('/api/v1/approvals', () => {
    return HttpResponse.json(mockApprovals)
  }),
  http.post('/api/v1/approvals/:id/approve', () => {
    return HttpResponse.json({ success: true })
  }),
  http.post('/api/v1/approvals/:id/reject', () => {
    return HttpResponse.json({ success: true })
  })
]
