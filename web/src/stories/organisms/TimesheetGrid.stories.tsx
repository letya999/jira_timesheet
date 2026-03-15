import type { Meta, StoryObj } from '@storybook/react'
import { TimesheetGrid } from '@/components/time/timesheet-grid'
import { http, HttpResponse, delay } from 'msw'
import { fn } from '@storybook/test'

const meta: Meta<typeof TimesheetGrid> = {
  title: 'Organisms/TimesheetGrid',
  component: TimesheetGrid,
  tags: ['autodocs'],
  args: {
    startDate: new Date(2026, 2, 9), // Monday
    entries: [],
    onUpdate: fn(async () => { await delay(500) }),
  },
} satisfies Meta<typeof TimesheetGrid>

export default meta
type Story = StoryObj<typeof meta>

const mockEntries = Array.from({ length: 50 }, (_, i) => ({
  id: `task-${i + 1}`,
  taskName: `Feature Implementation ${i + 1}`,
  projectKey: 'JIRA-123',
  values: {
    '2026-03-09': i % 3 === 0 ? 4 : 0,
    '2026-03-10': i % 2 === 0 ? 8 : 2,
    '2026-03-11': 6,
    '2026-03-12': 0,
    '2026-03-13': 7.5,
  }
}))

export const Populated: Story = {
  args: {
    entries: mockEntries,
  },
}

export const Empty: Story = {
  args: {
    entries: [],
  },
}

export const Loading: Story = {
  parameters: {
    msw: {
      handlers: [
        http.get('/api/v1/timesheets', async () => {
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
        http.get('/api/v1/timesheets', () => {
          return new HttpResponse(null, { status: 500 })
        }),
      ],
    },
  },
}
