import type { Meta, StoryObj } from "@storybook/react"
import { DatePicker } from "./date-picker"
import * as React from "react"

const meta: Meta<typeof DatePicker> = {
  title: "UI/DatePicker",
  component: DatePicker,
}

export default meta
type Story = StoryObj<typeof DatePicker>

export const Default: Story = {
  render: () => {
    const [date, setDate] = React.useState<Date | undefined>(new Date())
    return <DatePicker date={date} setDate={setDate} />
  },
}

export const Disabled: Story = {
  render: () => {
    return <DatePicker disabled />
  },
}
