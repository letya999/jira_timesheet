import type { Meta, StoryObj } from '@storybook/react'
import { EmployeeCard } from '@/components/shared/employee-card'
import { http, HttpResponse, delay } from 'msw'

const mockUser = {
  id: 1,
  email: 'john.doe@example.com',
  full_name: 'John Doe',
  role: 'Senior Software Engineer',
  org_unit_id: 10,
  is_active: true,
  jira_user_id: 123
}

const meta: Meta<typeof EmployeeCard> = {
  title: 'Organisms/EmployeeCard',
  component: EmployeeCard,
  tags: ['autodocs'],
  args: {
    user: mockUser,
    hoursPeriod: 32.5,
    syncStatus: 'synced',
  },
} satisfies Meta<typeof EmployeeCard>

export default meta
type Story = StoryObj<typeof meta>

export const Populated: Story = {
  args: {
    user: mockUser,
    hoursPeriod: 32.5,
    syncStatus: 'synced',
  },
}

export const SyncPending: Story = {
  args: {
    syncStatus: 'pending',
  },
}

export const SyncFailed: Story = {
  args: {
    syncStatus: 'failed',
  },
}

export const Empty: Story = {
  args: {
    user: { ...mockUser, full_name: null },
    hoursPeriod: 0,
  },
}

export const Loading: Story = {
  parameters: {
    msw: {
      handlers: [
        http.get('/api/v1/users/:id', async () => {
          await delay('infinite')
          return HttpResponse.json({})
        }),
      ],
    },
  },
}

export const Error: Story = {
  parameters: {
    msw: {
      handlers: [
        http.get('/api/v1/users/:id', () => {
          return new HttpResponse(null, { status: 500 })
        }),
      ],
    },
  },
}
