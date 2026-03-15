import { http, HttpResponse } from 'msw'
import type { WorklogResponse } from '@/api/generated/types.gen'

const mockWorklogs: WorklogResponse[] = [
  {
    id: 1,
    date: '2026-03-15',
    hours: 4,
    description: 'Developed molecules',
    status: 'APPROVED',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: 2,
    date: '2026-03-15',
    hours: 4,
    description: 'MSW setup',
    status: 'PENDING',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }
]

export const timesheetHandlers = [
  http.get('/api/v1/worklogs', () => {
    return HttpResponse.json<WorklogResponse[]>(mockWorklogs)
  }),
  http.post('/api/v1/worklogs', async ({ request }) => {
    const newWorklog = (await request.json()) as any
    return HttpResponse.json<WorklogResponse>({
      ...newWorklog,
      id: Math.floor(Math.random() * 1000)
    })
  })
]
