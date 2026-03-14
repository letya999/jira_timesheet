import type { Meta, StoryObj } from "@storybook/react"
import { SyncIndicator } from "./sync-indicator"

const meta: Meta<typeof SyncIndicator> = {
  title: "Jira/SyncIndicator",
  component: SyncIndicator,
  tags: ["autodocs"],
  argTypes: {
    isSyncing: {
      control: "boolean",
    },
    lastSync: {
      control: "date",
    },
  },
}

export default meta
type Story = StoryObj<typeof SyncIndicator>

export const Default: Story = {
  args: {
    isSyncing: false,
    lastSync: new Date().toISOString(),
  },
}

export const Syncing: Story = {
  args: {
    isSyncing: true,
  },
}

export const NeverSynced: Story = {
  args: {
    lastSync: null,
  },
}
