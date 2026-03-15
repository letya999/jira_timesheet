import type { Meta, StoryObj } from '@storybook/react'
import { GanttChartWrapper, GanttTask, GanttLink } from '@/components/gantt/gantt-chart-wrapper'

const meta: Meta<typeof GanttChartWrapper> = {
  title: 'Organisms/GanttWrapper',
  component: GanttChartWrapper,
  tags: ['autodocs'],
} satisfies Meta<typeof GanttChartWrapper>

export default meta
type Story = StoryObj<typeof meta>

const mockTasks: { data: GanttTask[], links: GanttLink[] } = {
  data: [
    { id: 1, text: "Project Alpha", start_date: "2026-03-01", duration: 30, open: true, type: "project" },
    { id: 2, text: "Design Phase", start_date: "2026-03-01", duration: 10, parent: 1 },
    { id: 3, text: "Implementation", start_date: "2026-03-11", duration: 15, parent: 1 },
    { id: 4, text: "Testing", start_date: "2026-03-26", duration: 5, parent: 1 },
  ],
  links: [
    { id: 1, source: 2, target: 3, type: "0" },
    { id: 2, source: 3, target: 4, type: "0" },
  ]
}

export const Populated: Story = {
  args: {
    tasks: mockTasks,
    config: {
      readonly: true,
    }
  },
}

export const Editable: Story = {
  args: {
    tasks: mockTasks,
    config: {
      readonly: false,
      drag_move: true,
      drag_resize: true,
    }
  },
}

export const Empty: Story = {
  args: {
    tasks: { data: [], links: [] },
  },
}

// No Loading/Error for Gantt per spec (static task data)
