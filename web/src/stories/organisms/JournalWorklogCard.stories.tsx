import type { Meta, StoryObj } from '@storybook/react'
import { JournalWorklogCard } from '@/components/time/journal-worklog-card'
import type { WorklogResponse } from '@/api/generated/types.gen'

const sampleLog: WorklogResponse = {
  id: 252,
  date: '2026-03-13',
  hours: 2,
  type: 'JIRA',
  status: 'APPROVED',
  category_id: 1,
  description: 'Оптимизировать страницу модерации',
  source_created_at: '2026-03-13T19:44:00Z',
  created_at: '2026-03-13T19:44:00Z',
  updated_at: '2026-03-13T19:44:00Z',
  user_name: 'Oleg Maslo',
  jira_account_id: 'acc-1',
  issue_key: 'TWBACKEND-252',
  issue_summary: 'Оптимизировать страницу модерации',
  project_name: 'TW_Backend',
  category: 'Development',
  category_name: 'Development',
  team_name: 'Backend',
}

const meta: Meta<typeof JournalWorklogCard> = {
  title: 'Organisms/JournalWorklogCard',
  component: JournalWorklogCard,
  tags: ['autodocs'],
  args: {
    log: sampleLog,
  },
} satisfies Meta<typeof JournalWorklogCard>

export default meta
type Story = StoryObj<typeof meta>

export const JiraEntry: Story = {}

export const ManualEntry: Story = {
  args: {
    log: {
      ...sampleLog,
      id: 300,
      type: 'MANUAL',
      issue_key: null,
      issue_summary: null,
      description: 'Internal planning and docs',
      category: 'Operations',
      category_name: 'Operations',
    },
  },
}
