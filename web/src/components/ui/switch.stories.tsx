import type { Meta, StoryObj } from "@storybook/react"
import { Switch } from "./switch"

const meta: Meta<typeof Switch> = {
  title: "Atoms/Switch",
  component: Switch,
  tags: ["autodocs"],
  argTypes: {
    disabled: {
      control: "boolean",
    },
    checked: {
      control: "boolean",
    },
    size: {
      control: "select",
      options: ["default", "sm"],
    },
  },
}

export default meta
type Story = StoryObj<typeof Switch>

export const Default: Story = {
  args: {
    id: "airplane-mode",
  },
}

export const Checked: Story = {
  args: {
    id: "airplane-mode-checked",
    defaultChecked: true,
  },
}

export const Small: Story = {
  args: {
    size: "sm",
  },
}

export const Disabled: Story = {
  args: {
    id: "airplane-mode-disabled",
    disabled: true,
  },
}

export const WithLabel: Story = {
  render: (args) => (
    <div className="flex items-center space-x-2">
      <Switch id="airplane-mode-label" {...args} />
      <label
        htmlFor="airplane-mode-label"
        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
      >
        Airplane Mode
      </label>
    </div>
  ),
}

export const DisabledWithLabel: Story = {
  render: (args) => (
    <div className="flex items-center space-x-2">
      <Switch id="airplane-mode-disabled-label" disabled {...args} />
      <label
        htmlFor="airplane-mode-disabled-label"
        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
      >
        Airplane Mode (Disabled)
      </label>
    </div>
  ),
}
