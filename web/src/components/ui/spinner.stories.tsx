import type { Meta, StoryObj } from "@storybook/react"
import { Spinner } from "./spinner"

const meta: Meta<typeof Spinner> = {
  title: "Atoms/Spinner",
  component: Spinner,
  tags: ["autodocs"],
}

export default meta
type Story = StoryObj<typeof Spinner>

export const Default: Story = {
  args: {},
}

export const Large: Story = {
  args: {
    className: "size-8",
  },
}

export const CustomColor: Story = {
  args: {
    className: "text-blue-500",
  },
}
