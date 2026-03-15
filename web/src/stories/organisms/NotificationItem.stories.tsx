import type { Meta, StoryObj } from '@storybook/react'
import { NotificationItem, NotificationType } from '@/components/shared/notification-item'
import { http, HttpResponse, delay } from 'msw'
import { fn } from '@storybook/test'

const meta: Meta<typeof NotificationItem> = {
  title: 'Organisms/NotificationItem',
  component: NotificationItem,
  tags: ['autodocs'],
  args: {
    id: 1,
    type: 'SUCCESS' as NotificationType,
    message: 'Your timesheet for period March 1-15 has been approved.',
    createdAt: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
    isRead: false,
    onRead: fn(),
  },
} satisfies Meta<typeof NotificationItem>

export default meta
type Story = StoryObj<typeof meta>

export const Success: Story = {
  args: {
    type: 'SUCCESS',
    isRead: false,
  },
}

export const Warning: Story = {
  args: {
    type: 'WARNING',
    message: 'Your Jira sync failed for project TS. Please check your credentials.',
    isRead: false,
  },
}

export const Read: Story = {
  args: {
    type: 'INFO',
    message: 'New system maintenance scheduled for March 20.',
    isRead: true,
  },
}

export const ErrorState: Story = {
  args: {
    type: 'ERROR',
    message: 'Critical error: Database connection lost.',
    isRead: false,
  },
}

export const Loading: Story = {
  parameters: {
    msw: {
      handlers: [
        http.get('/api/v1/notifications', async () => {
          await delay('infinite')
          return HttpResponse.json([])
        }),
      ],
    },
  },
}

export const Empty: Story = {
  args: {
    message: '',
  },
}

export const ErrorStory: Story = {
  parameters: {
    msw: {
      handlers: [
        http.get('/api/v1/notifications', () => {
          return new HttpResponse(null, { status: 500 })
        }),
      ],
    },
  },
}
