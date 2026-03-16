import type { Meta, StoryObj } from '@storybook/react'
import { fn } from '@storybook/test'
import { SortOrderControl } from '@/components/shared/sort-order-control'

const meta: Meta<typeof SortOrderControl> = {
  title: 'Molecules/SortOrderControl',
  component: SortOrderControl,
  tags: ['autodocs'],
  args: {
    value: 'desc',
    onChange: fn(),
    label: 'Сортировка по дате',
  },
} satisfies Meta<typeof SortOrderControl>

export default meta
type Story = StoryObj<typeof meta>

export const Desc: Story = {}

export const Asc: Story = {
  args: {
    value: 'asc',
  },
}
