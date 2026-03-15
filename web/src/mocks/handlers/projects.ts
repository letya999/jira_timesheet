import { http, HttpResponse } from 'msw'
import type { ProjectResponse } from '@/api/generated/types.gen'

const mockProjects: ProjectResponse[] = [
  {
    id: 1,
    jira_id: 'PRJ-101',
    key: 'TS',
    name: 'Timesheet Project',
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: 2,
    jira_id: 'PRJ-102',
    key: 'DS',
    name: 'Design System',
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }
]

export const projectsHandlers = [
  http.get('/api/v1/projects', () => {
    return HttpResponse.json<ProjectResponse[]>(mockProjects)
  })
]
