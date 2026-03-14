import type { Meta, StoryObj } from "@storybook/react"
import { Button } from "./button"
import { SearchIcon } from "lucide-react"

const meta: Meta<typeof Button> = {
  title: "Atoms/Button",
  component: Button,
  tags: ["autodocs"],
  argTypes: {
    variant: {
      control: "select",
      options: ["default", "outline", "secondary", "ghost", "destructive", "link"],
    },
    size: {
      control: "select",
      options: ["default", "xs", "sm", "lg", "icon", "icon-xs", "icon-sm", "icon-lg"],
    },
    disabled: {
      control: "boolean",
    },
  },
}

export default meta
type Story = StoryObj<typeof Button>

export const Default: Story = {
  args: {
    children: "Button",
    variant: "default",
    size: "default",
  },
}

export const Outline: Story = {
  args: {
    children: "Outline",
    variant: "outline",
  },
}

export const Secondary: Story = {
  args: {
    children: "Secondary",
    variant: "secondary",
  },
}

export const Ghost: Story = {
  args: {
    children: "Ghost",
    variant: "ghost",
  },
}

export const Destructive: Story = {
  args: {
    children: "Destructive",
    variant: "destructive",
  },
}

export const Link: Story = {
  args: {
    children: "Link Button",
    variant: "link",
  },
}

export const WithIcon: Story = {
  args: {
    variant: "default",
    children: (
      <>
        <SearchIcon data-icon="inline-start" />
        Search
      </>
    ),
  },
}

export const IconOnly: Story = {
  args: {
    variant: "outline",
    size: "icon",
    children: <SearchIcon />,
    "aria-label": "Search",
  },
}

export const Loading: Story = {
  render: (args) => (
    <Button {...args} disabled>
      <span className="mr-2 size-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
      Loading...
    </Button>
  ),
}

export const Small: Story = {
  args: {
    size: "sm",
    children: "Small Button",
  },
}

export const Large: Story = {
  args: {
    size: "lg",
    children: "Large Button",
  },
}

export const Disabled: Story = {
  args: {
    disabled: true,
    children: "Disabled Button",
  },
}
