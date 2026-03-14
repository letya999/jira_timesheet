import type { Meta, StoryObj } from "@storybook/react"
import { TimeGrid } from "./time-grid"

const meta: Meta<typeof TimeGrid> = {
  title: "Time/TimeGrid",
  component: TimeGrid,
  tags: ["autodocs"],
  argTypes: {
    startDate: {
      control: "date",
    },
    entries: {
      control: "object",
    },
  },
}

export default meta
type Story = StoryObj<typeof TimeGrid>

export const Default: Story = {
  args: {
    startDate: new Date("2024-03-11"), // A Monday
    entries: [
      {
        taskId: "TASK-123",
        taskName: "Development of new features",
        values: {
          "2024-03-11": 4,
          "2024-03-12": 6,
          "2024-03-13": 8,
        }
      },
      {
        taskId: "TASK-456",
        taskName: "Bug fixing",
        values: {
          "2024-03-11": 2,
          "2024-03-12": 2,
        }
      }
    ],
  },
}

export const Empty: Story = {
  args: {
    startDate: new Date(),
    entries: [],
  },
}
