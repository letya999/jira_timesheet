import type { Meta, StoryObj } from '@storybook/react'
import { EmptyState } from '@/components/shared/empty-state'
import { Search, Plus, FileText } from 'lucide-react'
import { fn } from '@storybook/test'

const meta: Meta<typeof EmptyState> = {
  title: 'Molecules/EmptyState',
  component: EmptyState,
  tags: ['autodocs'],
} satisfies Meta<typeof EmptyState>

export default meta
type Story = StoryObj<typeof meta>

export const NoResults: Story = {
  args: {
    icon: Search,
    title: 'No results found',
    description: 'We couldn\'t find anything matching your search criteria. Try different keywords.',
  },
}

export const NoData: Story = {
  args: {
    icon: FileText,
    title: 'No worklogs yet',
    description: 'You haven\'t logged any hours for this period. Start by adding a new worklog.',
    action: {
      label: 'Add Worklog',
      onClick: fn(),
    },
  },
}

export const Projects: Story = {
  args: {
    icon: Plus,
    title: 'No projects available',
    description: 'There are no active projects to display. Create a new project to get started.',
    action: {
      label: 'Create Project',
      onClick: fn(),
    },
  },
}
