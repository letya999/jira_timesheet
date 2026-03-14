import type { Meta, StoryObj } from '@storybook/react'
import { SearchBar } from '@/components/shared/search-bar'
import { fn } from '@storybook/test'

const meta: Meta<typeof SearchBar> = {
  title: 'Molecules/SearchBar',
  component: SearchBar,
  tags: ['autodocs'],
  args: {
    onChange: fn(),
    onClear: fn(),
  },
} satisfies Meta<typeof SearchBar>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: {
    value: '',
    placeholder: 'Search for tasks...',
  },
}

export const WithValue: Story = {
  args: {
    value: 'MSW Setup',
  },
}

export const CustomDebounce: Story = {
  args: {
    value: '',
    debounceMs: 1000,
    placeholder: 'Slower debounce (1s)...',
  },
}
