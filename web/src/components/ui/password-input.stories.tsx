import type { Meta, StoryObj } from "@storybook/react"
import { PasswordInput } from "./password-input"

const meta: Meta<typeof PasswordInput> = {
  title: "Atoms/PasswordInput",
  component: PasswordInput,
  tags: ["autodocs"],
  argTypes: {
    disabled: {
      control: "boolean",
    },
  },
}

export default meta
type Story = StoryObj<typeof PasswordInput>

export const Default: Story = {
  args: {
    placeholder: "Enter password",
  },
}

export const Disabled: Story = {
  args: {
    disabled: true,
    defaultValue: "SecretPassword123",
  },
}

export const WithValue: Story = {
  args: {
    defaultValue: "SecretPassword123",
  },
}
