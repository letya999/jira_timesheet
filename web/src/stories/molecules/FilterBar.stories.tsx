import type { Meta, StoryObj } from '@storybook/react'
import { FilterBar } from '@/components/shared/filter-bar'
import { fn } from '@storybook/test'

const meta: Meta<typeof FilterBar> = {
  title: 'Molecules/FilterBar',
  component: FilterBar,
  tags: ['autodocs'],
  args: {
    onRemove: fn(),
    onClear: fn(),
  },
} satisfies Meta<typeof FilterBar>

export default meta
type Story = StoryObj<typeof meta>

export const SingleFilter: Story = {
  args: {
    filters: [
      { id: 'status', label: 'Status', value: 'Active' },
    ],
  },
}

export const MultipleFilters: Story = {
  args: {
    filters: [
      { id: 'status', label: 'Status', value: 'Active' },
      { id: 'role', label: 'Role', value: 'Admin' },
      { id: 'dept', label: 'Department', value: 'Engineering' },
    ],
  },
}

export const Empty: Story = {
  args: {
    filters: [],
  },
}
