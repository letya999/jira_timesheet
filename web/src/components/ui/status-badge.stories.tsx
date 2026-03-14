import type { Meta, StoryObj } from "@storybook/react"
import { StatusBadge } from "./status-badge"

const meta: Meta<typeof StatusBadge> = {
  title: "Atoms/StatusBadge",
  component: StatusBadge,
  tags: ["autodocs"],
  argTypes: {
    status: {
      control: "select",
      options: ["todo", "in_progress", "done", "blocked", "review", "backlog"],
    },
  },
}

export default meta
type Story = StoryObj<typeof StatusBadge>

export const AllStatuses: Story = {
  render: () => (
    <div className="flex flex-wrap gap-2">
      <StatusBadge status="todo">To Do</StatusBadge>
      <StatusBadge status="in_progress">In Progress</StatusBadge>
      <StatusBadge status="done">Done</StatusBadge>
      <StatusBadge status="blocked">Blocked</StatusBadge>
      <StatusBadge status="review">Review</StatusBadge>
      <StatusBadge status="backlog">Backlog</StatusBadge>
    </div>
  ),
}

export const Todo: Story = {
  args: {
    status: "todo",
    children: "To Do",
  },
}

export const InProgress: Story = {
  args: {
    status: "in_progress",
    children: "In Progress",
  },
}

export const Done: Story = {
  args: {
    status: "done",
    children: "Done",
  },
}
