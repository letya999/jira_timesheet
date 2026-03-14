import type { Meta, StoryObj } from "@storybook/react"
import { StatItem } from "./stat-item"
import { Users, Clock, Calendar, TrendingUp } from "lucide-react"

const meta: Meta<typeof StatItem> = {
  title: "UI/StatItem",
  component: StatItem,
  tags: ["autodocs"],
}

export default meta
type Story = StoryObj<typeof StatItem>

export const Default: Story = {
  args: {
    label: "Total Revenue",
    value: "$45,231.89",
    description: "+20.1% from last month",
    icon: <TrendingUp className="size-4" />,
  },
}

export const WithTrend: Story = {
  args: {
    label: "Active Users",
    value: "+2350",
    trend: {
      value: "+180.1%",
      label: "from last month",
      variant: "positive",
    },
    icon: <Users className="size-4" />,
  },
}

export const VacationStats: Story = {
  args: {
    label: "Vacation Days Left",
    value: "14",
    description: "Out of 28 total days",
    icon: <Calendar className="size-4" />,
  },
}

export const SickLeave: Story = {
  args: {
    label: "Sick Leave Taken",
    value: "2",
    trend: {
      value: "-1",
      label: "vs previous year",
      variant: "neutral",
    },
    icon: <Clock className="size-4" />,
  },
}
