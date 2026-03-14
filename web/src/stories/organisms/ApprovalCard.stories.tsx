import type { Meta, StoryObj } from '@storybook/react'
import { ApprovalCard } from '@/components/shared/approval-card'
import { http, HttpResponse, delay } from 'msw'
import { fn } from '@storybook/test'

const meta: Meta<typeof ApprovalCard> = {
  title: 'Organisms/ApprovalCard',
  component: ApprovalCard,
  tags: ['autodocs'],
  args: {
    id: 1,
    userName: 'John Doe',
    userEmail: 'john.doe@example.com',
    startDate: '2026-03-01',
    endDate: '2026-03-15',
    totalHours: 120,
    status: 'SUBMITTED',
    onApprove: fn(async () => { await delay(500) }),
    onReject: fn(async () => { await delay(500) }),
  },
} satisfies Meta<typeof ApprovalCard>

export default meta
type Story = StoryObj<typeof meta>

export const Populated: Story = {
  args: {
    status: 'SUBMITTED',
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

export const Loading: Story = {
  parameters: {
    msw: {
      handlers: [
        http.post('/api/v1/approvals/:id/approve', async () => {
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
        http.post('/api/v1/approvals/:id/approve', () => {
          return new HttpResponse(null, { status: 500 })
        }),
      ],
    },
  },
}

export const Empty: Story = {
  args: {
    totalHours: 0,
  },
}
