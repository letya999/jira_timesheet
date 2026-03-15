import { http, HttpResponse } from 'msw'

const mockOrgTree = {
  id: 1,
  name: 'Global Enterprise',
  type: 'ORGANIZATION',
  memberCount: 500,
  children: [
    {
      id: 2,
      name: 'Engineering',
      type: 'DEPARTMENT',
      memberCount: 200,
      children: [
        { id: 4, name: 'Frontend Team', type: 'TEAM', memberCount: 15 },
        { id: 5, name: 'Backend Team', type: 'TEAM', memberCount: 20 },
      ]
    }
  ]
}

export const orgHandlers = [
  http.get('/api/v1/org/tree', () => {
    return HttpResponse.json(mockOrgTree)
  })
]
