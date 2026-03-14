import type { Meta, StoryObj } from '@storybook/react'
import { SyncStatusWidget } from '@/components/shared/sync-status-widget'
import { http, HttpResponse, delay } from 'msw'
import { fn } from '@storybook/test'

const meta: Meta<typeof SyncStatusWidget> = {
  title: 'Organisms/SyncStatusWidget',
  component: SyncStatusWidget,
  tags: ['autodocs'],
  args: {
    status: 'idle' as const,
    lastSyncAt: new Date(Date.now() - 3600000).toISOString(),
    onTriggerSync: fn(async () => { await delay(500) }),
  },
} satisfies Meta<typeof SyncStatusWidget>

export default meta
type Story = StoryObj<typeof meta>

export const Populated: Story = {
  args: {
    status: 'idle',
    lastSyncAt: new Date(Date.now() - 3600000).toISOString(),
  },
}

export const Syncing: Story = {
  args: {
    status: 'syncing',
    progress: 45,
  },
}

export const Success: Story = {
  args: {
    status: 'success',
  },
}

export const ErrorState: Story = {
  args: {
    status: 'error',
  },
}

export const Empty: Story = {
  args: {
    lastSyncAt: undefined,
    status: 'idle',
  },
}

export const Loading: Story = {
  parameters: {
    msw: {
      handlers: [
        http.get('/api/v1/sync/status', async () => {
          await delay('infinite')
          return HttpResponse.json({})
        }),
      ],
    },
  },
}

export const ErrorStory: Story = {
  parameters: {
    msw: {
      handlers: [
        http.get('/api/v1/sync/status', () => {
          return new HttpResponse(null, { status: 500 })
        }),
      ],
    },
  },
}
