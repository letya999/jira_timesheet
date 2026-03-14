import type { Meta, StoryObj } from '@storybook/react'
import { DateRangePickerTZ } from '@/components/shared/date-range-picker-tz'
import { addDays } from 'date-fns'
import { fn } from '@storybook/test'

const meta: Meta<typeof DateRangePickerTZ> = {
  title: 'Molecules/DateRangePicker',
  component: DateRangePickerTZ,
  tags: ['autodocs'],
  args: {
    onChange: fn(),
  },
} satisfies Meta<typeof DateRangePickerTZ>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: {
    value: undefined,
  },
}

export const SelectedRange: Story = {
  args: {
    value: {
      from: new Date(2026, 2, 1),
      to: addDays(new Date(2026, 2, 1), 7),
    },
  },
}

export const TokyoTime: Story = {
  args: {
    value: {
      from: new Date(2026, 2, 1),
      to: addDays(new Date(2026, 2, 1), 7),
    },
    timezone: 'Asia/Tokyo',
  },
}

export const NewYorkTime: Story = {
  args: {
    value: {
      from: new Date(2026, 2, 1),
      to: addDays(new Date(2026, 2, 1), 7),
    },
    timezone: 'America/New_York',
  },
}
