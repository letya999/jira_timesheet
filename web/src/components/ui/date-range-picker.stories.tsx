import type { Meta, StoryObj } from "@storybook/react"
import { DateRangePicker } from "./date-range-picker"
import * as React from "react"
import { DateRange } from "react-day-picker"

const meta: Meta<typeof DateRangePicker> = {
  title: "UI/DateRangePicker",
  component: DateRangePicker,
}

export default meta
type Story = StoryObj<typeof DateRangePicker>

export const Default: Story = {
  render: () => {
    const [date, setDate] = React.useState<DateRange | undefined>({
      from: new Date(),
      to: new Date(new Date().setDate(new Date().getDate() + 7)),
    })
    return <DateRangePicker date={date} setDate={setDate} />
  },
}

export const Disabled: Story = {
  render: () => {
    return <DateRangePicker disabled />
  },
}
