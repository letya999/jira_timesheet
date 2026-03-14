import type { Meta, StoryObj } from '@storybook/react'
import { LeaveRequestCard } from '@/components/leave/leave-request-card'
import { http, HttpResponse, delay } from 'msw'
import { fn } from '@storybook/test'
import type { LeaveType } from '@/api/generated/types.gen'

const meta: Meta<typeof LeaveRequestCard> = {
  title: 'Organisms/LeaveRequestCard',
  component: LeaveRequestCard,
  tags: ['autodocs'],
  args: {
    id: 1,
    userName: 'Jane Smith',
    userEmail: 'jane.smith@example.com',
    type: 'VACATION' as LeaveType,
    status: 'PENDING',
    startDate: '2026-04-01',
    endDate: '2026-04-10',
    reason: 'Annual family trip to Japan.',
    canAction: true,
    onApprove: fn(async () => { await delay(500) }),
    onReject: fn(async () => { await delay(500) }),
    onCancel: fn(async () => { await delay(500) }),
  },
} satisfies Meta<typeof LeaveRequestCard>

export default meta
type Story = StoryObj<typeof meta>

export const Pending: Story = {
  args: {
    status: 'PENDING',
  },
}

export const Approved: Story = {
  args: {
    status: 'APPROVED',
  },
}

export const Rejected: Story = {
  args: {
    status: 'REJECTED',
  },
}

export const Cancelled: Story = {
  args: {
    status: 'CANCELLED',
    canAction: false,
  },
}

export const NoReason: Story = {
  args: {
    reason: undefined,
  },
}

export const Loading: Story = {
  parameters: {
    msw: {
      handlers: [
        http.post('/api/v1/leave-requests/:id/approve', async () => {
          await delay('infinite')
          return HttpResponse.json({})
        }),
      ],
    },
  },
}

export const ErrorState: Story = {
  parameters: {
    msw: {
      handlers: [
        http.post('/api/v1/leave-requests/:id/approve', () => {
          return new HttpResponse(null, { status: 500 })
        }),
      ],
    },
  },
}

export const Empty: Story = {
  args: {
    userName: 'Unknown',
    reason: '',
  },
}
