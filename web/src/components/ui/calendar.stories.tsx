import type { Meta, StoryObj } from "@storybook/react"
import { Calendar } from "./calendar"
import * as React from "react"

const meta: Meta<typeof Calendar> = {
  title: "UI/Calendar",
  component: Calendar,
  argTypes: {},
}

export default meta
type Story = StoryObj<typeof Calendar>

export const Default: Story = {
  render: function Render() {
    const [date, setDate] = React.useState<Date | undefined>(new Date())
    return (
      <Calendar
        mode="single"
        selected={date}
        onSelect={setDate}
        className="rounded-md border shadow"
      />
    )
  },
}

export const Range: Story = {
  render: () => {
    return (
      <Calendar
        mode="range"
        className="rounded-md border shadow"
      />
    )
  },
}

export const Multiple: Story = {
  render: () => {
    return (
      <Calendar
        mode="multiple"
        className="rounded-md border shadow"
      />
    )
  },
}
