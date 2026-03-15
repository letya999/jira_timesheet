import type { Meta, StoryObj } from '@storybook/react'
import { ErrorFallback } from '@/components/shared/error-fallback'
import { fn } from '@storybook/test'

const meta: Meta<typeof ErrorFallback> = {
  title: 'Molecules/ErrorFallback',
  component: ErrorFallback,
  tags: ['autodocs'],
  args: {
    resetError: fn(),
  },
} satisfies Meta<typeof ErrorFallback>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: {
    error: new Error('Network request failed with status 500'),
  },
}

export const NoReset: Story = {
  args: {
    error: new Error('Your session has expired. Please log in again.'),
    resetError: undefined,
  },
}
