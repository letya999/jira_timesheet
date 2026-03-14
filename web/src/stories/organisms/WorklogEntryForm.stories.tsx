import type { Meta, StoryObj } from '@storybook/react'
import { WorklogEntryForm } from '@/components/time/worklog-entry-form'
import { http, HttpResponse, delay } from 'msw'
import { fn } from '@storybook/test'

const meta: Meta<typeof WorklogEntryForm> = {
  title: 'Organisms/WorklogEntryForm',
  component: WorklogEntryForm,
  tags: ['autodocs'],
  args: {
    onSubmit: fn(),
    onCancel: fn(),
  },
} satisfies Meta<typeof WorklogEntryForm>

export default meta
type Story = StoryObj<typeof meta>

const projectsHandlers = [
  http.get('/api/v1/projects', () => {
    return HttpResponse.json([
      { id: 1, name: 'Timesheet Project', key: 'TS' },
      { id: 2, name: 'Design System', key: 'DS' },
    ])
  })
]

export const Populated: Story = {
  parameters: {
    msw: {
      handlers: projectsHandlers
    },
  },
}

export const Loading: Story = {
  parameters: {
    msw: {
      handlers: [
        http.get('/api/v1/projects', async () => {
          await delay('infinite')
          return HttpResponse.json([])
        }),
      ],
    },
  },
}

export const Error: Story = {
  parameters: {
    msw: {
      handlers: [
        http.get('/api/v1/projects', () => {
          return new HttpResponse(null, { status: 500 })
        }),
      ],
    },
  },
}

export const Empty: Story = {
  parameters: {
    msw: {
      handlers: [
        http.get('/api/v1/projects', () => {
          return HttpResponse.json([])
        }),
      ],
    },
  },
}
