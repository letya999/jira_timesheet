import type { Meta, StoryObj } from "@storybook/react"
import { ChatMessage } from "./chat-message"

const meta: Meta<typeof ChatMessage> = {
  title: "Chat/ChatMessage",
  component: ChatMessage,
  tags: ["autodocs"],
  argTypes: {
    role: {
      control: "select",
      options: ["user", "assistant", "system"],
    },
    content: {
      control: "text",
    },
    avatarUrl: {
      control: "text",
    },
    username: {
      control: "text",
    },
  },
}

export default meta
type Story = StoryObj<typeof ChatMessage>

export const Assistant: Story = {
  args: {
    role: "assistant",
    content: "Hello! I can help you track your time. You can mention tasks like **TASK-123** and I will link them automatically.",
  },
}

export const User: Story = {
  args: {
    role: "user",
    content: "I want to log 2 hours for task [PROJ-456](https://jira.example.com/browse/PROJ-456).",
  },
}

export const Markdown: Story = {
  args: {
    role: "assistant",
    content: `Here is a summary:
- Task 1: COMPLETED
- Task 2: IN PROGRESS

| Day | Hours |
|---|---|
| Mon | 8 |
| Tue | 6 |

Check [this guide](https://google.com) for more info.`,
  },
}
