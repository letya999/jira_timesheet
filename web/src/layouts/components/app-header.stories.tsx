import type { Meta, StoryObj } from '@storybook/react'
import { expect, fn, within } from '@storybook/test'
import { I18nextProvider } from 'react-i18next'
import { ThemeProvider } from '@/components/shared/theme-provider'
import { SidebarProvider } from '@/components/ui/sidebar'
import i18n from '@/i18n'
import { AppHeader } from './app-header'

const meta: Meta<typeof AppHeader> = {
  title: 'Layouts/AppHeader',
  component: AppHeader,
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <ThemeProvider storageKey="storybook-theme">
        <I18nextProvider i18n={i18n}>
          <SidebarProvider defaultOpen>
            <Story />
          </SidebarProvider>
        </I18nextProvider>
      </ThemeProvider>
    ),
  ],
}

export default meta
type Story = StoryObj<typeof AppHeader>

export const Default: Story = {
  args: {
    userName: 'Alex Ivanov',
    userEmail: 'alex.ivanov@jt.local',
    userInitials: 'AI',
    unreadCount: 3,
    onOpenNotifications: fn(),
    onLogout: fn(),
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await expect(canvas.getByText('JT')).toBeInTheDocument()
    await expect(canvas.getByLabelText('Toggle Sidebar')).toBeInTheDocument()
    await expect(canvas.getByLabelText('Open notifications')).toBeInTheDocument()
    await expect(canvas.getByLabelText('Open profile menu')).toBeInTheDocument()
  },
}

export const NoUnreadNotifications: Story = {
  args: {
    userName: 'Alex Ivanov',
    userEmail: 'alex.ivanov@jt.local',
    userInitials: 'AI',
    unreadCount: 0,
    onOpenNotifications: fn(),
    onLogout: fn(),
  },
}
