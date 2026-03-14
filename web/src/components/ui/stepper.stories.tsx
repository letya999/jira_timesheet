import type { Meta, StoryObj } from "@storybook/react"
import { Stepper } from "./stepper"
import * as React from "react"

const meta: Meta<typeof Stepper> = {
  title: "UI/Stepper",
  component: Stepper,
}

export default meta
type Story = StoryObj<typeof Stepper>

export const Default: Story = {
  render: () => {
    const [value, setValue] = React.useState(0)
    return <Stepper value={value} onValueChange={setValue} />
  },
}

export const Limits: Story = {
  render: () => {
    const [value, setValue] = React.useState(5)
    return <Stepper value={value} onValueChange={setValue} min={0} max={10} step={0.5} />
  },
}

export const Disabled: Story = {
  render: () => {
    return <Stepper disabled value={5} />
  },
}
