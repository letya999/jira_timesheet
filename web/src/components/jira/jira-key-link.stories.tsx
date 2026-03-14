import type { Meta, StoryObj } from "@storybook/react"
import { JiraKeyLink } from "./jira-key-link"

const meta: Meta<typeof JiraKeyLink> = {
  title: "Jira/JiraKeyLink",
  component: JiraKeyLink,
  tags: ["autodocs"],
  argTypes: {
    issueKey: {
      control: "text",
    },
    baseUrl: {
      control: "text",
    },
    showIcon: {
      control: "boolean",
    },
  },
}

export default meta
type Story = StoryObj<typeof JiraKeyLink>

export const Default: Story = {
  args: {
    issueKey: "TASK-123",
    baseUrl: "https://your-domain.atlassian.net",
  },
}

export const WithoutLink: Story = {
  args: {
    issueKey: "TASK-456",
  },
}

export const WithoutIcon: Story = {
  args: {
    issueKey: "TASK-789",
    baseUrl: "https://your-domain.atlassian.net",
    showIcon: false,
  },
}
