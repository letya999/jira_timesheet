import type { Meta, StoryObj } from '@storybook/react'
import { UserRow } from '@/components/shared/user-row'

const meta: Meta<typeof UserRow> = {
  title: 'Molecules/UserRow',
  component: UserRow,
  tags: ['autodocs'],
} satisfies Meta<typeof UserRow>

export default meta
type Story = StoryObj<typeof meta>

export const Active: Story = {
  args: {
    user: {
      id: 1,
      email: 'john.doe@example.com',
      full_name: 'John Doe',
      role: 'Senior Engineer',
      org_unit_id: 101,
      is_active: true,
      jira_user_id: 'jira-123',
      temporary_password: 'dummy'
    },
  },
}

export const Inactive: Story = {
  args: {
    user: {
      id: 2,
      email: 'jane.smith@example.com',
      full_name: 'Jane Smith',
      role: 'Project Manager',
      org_unit_id: 202,
      is_active: false,
      jira_user_id: 'jira-456',
      temporary_password: 'dummy'
    },
  },
}

export const NoOrg: Story = {
  args: {
    user: {
      id: 3,
      email: 'guest@example.com',
      full_name: 'Guest User',
      is_active: true,
      jira_user_id: 'jira-789',
      temporary_password: 'dummy'
    },
  },
}
