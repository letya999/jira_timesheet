import type { Meta, StoryObj } from '@storybook/react'
import { PaginationBar } from '@/components/shared/pagination-bar'
import { fn } from '@storybook/test'

const meta: Meta<typeof PaginationBar> = {
  title: 'Molecules/PaginationBar',
  component: PaginationBar,
  tags: ['autodocs'],
  args: {
    onPageChange: fn(),
    onPageSizeChange: fn(),
  },
} satisfies Meta<typeof PaginationBar>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: {
    page: 1,
    pageSize: 10,
    total: 100,
  },
}

export const MiddlePage: Story = {
  args: {
    page: 5,
    pageSize: 10,
    total: 100,
  },
}

export const LastPage: Story = {
  args: {
    page: 10,
    pageSize: 10,
    total: 100,
  },
}

export const LargeTotal: Story = {
  args: {
    page: 1,
    pageSize: 50,
    total: 1542,
  },
}
