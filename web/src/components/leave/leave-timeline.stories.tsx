import type { Meta, StoryObj } from "@storybook/react"
import { LeaveTimeline } from "./leave-timeline"

const meta: Meta<typeof LeaveTimeline> = {
  title: "Leave/LeaveTimeline",
  component: LeaveTimeline,
  tags: ["autodocs"],
  argTypes: {
    view: {
      control: "select",
      options: ["day", "week", "month", "quarter", "year"],
    },
    startDate: {
      control: "date",
    },
  },
}

export default meta
type Story = StoryObj<typeof LeaveTimeline>

const mockUsers = [
  { id: "1", name: "Alice Johnson", avatarUrl: "" },
  { id: "2", name: "Bob Smith", avatarUrl: "" },
  { id: "3", name: "Charlie Brown", avatarUrl: "" },
]

const mockEntries = [
  {
    id: "e1",
    userId: "1",
    userName: "Alice Johnson",
    type: "VACATION" as const,
    startDate: new Date("2024-03-11"),
    endDate: new Date("2024-03-15"),
    reason: "Going to Hawaii",
  },
  {
    id: "e2",
    userId: "2",
    userName: "Bob Smith",
    type: "SICK_LEAVE" as const,
    startDate: new Date("2024-03-12"),
    endDate: new Date("2024-03-13"),
    reason: "Flu",
  },
  {
    id: "e3",
    userId: "3",
    userName: "Charlie Brown",
    type: "DAY_OFF" as const,
    startDate: new Date("2024-03-14"),
    endDate: new Date("2024-03-14"),
    reason: "Moving day",
  },
]

export const DayView: Story = {
  args: {
    view: "day",
    startDate: new Date("2024-03-12"),
    users: mockUsers,
    entries: mockEntries,
  },
}

export const WeekView: Story = {
  args: {
    view: "week",
    startDate: new Date("2024-03-11"),
    users: mockUsers,
    entries: mockEntries,
  },
}

export const MonthView: Story = {
  args: {
    view: "month",
    startDate: new Date("2024-03-01"),
    users: mockUsers,
    entries: mockEntries,
  },
}
