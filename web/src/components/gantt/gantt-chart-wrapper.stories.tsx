import type { Meta, StoryObj } from "@storybook/react"
import { GanttChartWrapper } from "./gantt-chart-wrapper"

const meta: Meta<typeof GanttChartWrapper> = {
  title: "Gantt/GanttChartWrapper",
  component: GanttChartWrapper,
  tags: ["autodocs"],
  argTypes: {
    tasks: {
      control: "object",
    },
    config: {
      control: "object",
    },
  },
}

export default meta
type Story = StoryObj<typeof GanttChartWrapper>

export const Default: Story = {
  args: {
    tasks: {
      data: [
        { id: 1, text: "Project Alpha", start_date: "2024-03-01", duration: 10, progress: 0.6, open: true },
        { id: 2, text: "Task 1", start_date: "2024-03-01", duration: 5, progress: 0.8, parent: 1 },
        { id: 3, text: "Task 2", start_date: "2024-03-06", duration: 5, progress: 0.4, parent: 1 },
      ],
      links: [
        { id: 1, source: 2, target: 3, type: "0" }
      ]
    },
    config: {
      readonly: true
    }
  },
}
