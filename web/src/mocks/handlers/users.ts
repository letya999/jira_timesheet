import { http, HttpResponse } from 'msw'
import type { UserResponse } from '@/api/generated/types.gen'

const mockUsers: UserResponse[] = [
  {
    email: 'john.doe@example.com',
    full_name: 'John Doe',
    role: 'Admin',
    jira_user_id: 123,
    id: 1,
    is_active: true
  },
  {
    email: 'jane.smith@example.com',
    full_name: 'Jane Smith',
    role: 'User',
    jira_user_id: 456,
    id: 2,
    is_active: true
  }
]

export const usersHandlers = [
  http.get('/api/v1/users', () => {
    return HttpResponse.json<UserResponse[]>(mockUsers)
  }),
  http.get('/api/v1/users/:id', ({ params }) => {
    const { id } = params
    const user = mockUsers.find(u => u.id === Number(id))
    if (!user) {
      return new HttpResponse(null, { status: 404 })
    }
    return HttpResponse.json<UserResponse>(user)
  })
]
