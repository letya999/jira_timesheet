import type { Meta, StoryObj } from '@storybook/react'
import { ProjectRow } from '@/components/jira/project-row'
import { http, HttpResponse, delay } from 'msw'

const mockProject = {
  id: 1,
  jira_id: 'PRJ-101',
  key: 'TS',
  name: 'Timesheet Project',
  is_active: true,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-03-15T00:00:00Z'
}

const meta: Meta<typeof ProjectRow> = {
  title: 'Organisms/ProjectRow',
  component: ProjectRow,
  tags: ['autodocs'],
  args: {
    project: mockProject,
    lastSyncedAt: '2026-03-14T15:00:00Z',
  },
} satisfies Meta<typeof ProjectRow>

export default meta
type Story = StoryObj<typeof meta>

export const Populated: Story = {
  args: {
    project: mockProject,
    lastSyncedAt: '2026-03-14T15:00:00Z',
  },
}

export const Inactive: Story = {
  args: {
    project: { ...mockProject, is_active: false },
    lastSyncedAt: '2026-03-10T09:30:00Z',
  },
}

export const NeverSynced: Story = {
  args: {
    lastSyncedAt: undefined,
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
