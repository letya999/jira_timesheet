import type { Meta, StoryObj } from "@storybook/react"
import { Slider } from "./slider"

const meta: Meta<typeof Slider> = {
  title: "UI/Slider",
  component: Slider,
  argTypes: {},
}

export default meta
type Story = StoryObj<typeof Slider>

export const Default: Story = {
  args: {
    defaultValue: [50],
    max: 100,
    step: 1,
  },
}

export const Range: Story = {
  args: {
    defaultValue: [25, 75],
    max: 100,
    step: 1,
  },
}

export const Vertical: Story = {
  args: {
    defaultValue: [50],
    orientation: "vertical",
    className: "h-40",
  },
}

export const Disabled: Story = {
  args: {
    defaultValue: [50],
    disabled: true,
  },
}
