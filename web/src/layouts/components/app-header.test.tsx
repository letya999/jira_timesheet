import { useState, type ReactNode } from 'react'
import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { I18nextProvider } from 'react-i18next'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ThemeProvider } from '@/components/shared/theme-provider'
import { SidebarProvider } from '@/components/ui/sidebar'
import i18n from '@/i18n'
import { AppHeader } from './app-header'

interface TestWrapperProps {
  children: ReactNode
  onOpenChange?: (open: boolean) => void
}

function TestWrapper({ children, onOpenChange }: TestWrapperProps) {
  const [open, setOpen] = useState(true)

  return (
    <ThemeProvider storageKey="test-theme">
      <I18nextProvider i18n={i18n}>
        <SidebarProvider
          open={open}
          onOpenChange={(nextOpen) => {
            setOpen(nextOpen)
            onOpenChange?.(nextOpen)
          }}
        >
          {children}
        </SidebarProvider>
      </I18nextProvider>
    </ThemeProvider>
  )
}

describe('AppHeader', () => {
  beforeEach(() => {
    i18n.changeLanguage('en')
  })

  it('renders JT label and main controls', () => {
    render(
      <TestWrapper>
        <AppHeader
          userName="Alex Ivanov"
          userEmail="alex@jt.local"
          userInitials="AI"
          unreadCount={2}
          onOpenNotifications={vi.fn()}
          onLogout={vi.fn()}
        />
      </TestWrapper>,
    )

    expect(screen.getByText('JT')).toBeInTheDocument()
    expect(screen.getByLabelText('Toggle Sidebar')).toBeInTheDocument()
    expect(screen.getByLabelText('Open notifications')).toBeInTheDocument()
    expect(screen.getByLabelText('Open profile menu')).toBeInTheDocument()
    expect(screen.getByText('2')).toBeInTheDocument()
  })

  it('calls onOpenChange when sidebar trigger is clicked', () => {
    const handleOpenChange = vi.fn()

    render(
      <TestWrapper onOpenChange={handleOpenChange}>
        <AppHeader
          userName="Alex Ivanov"
          userEmail="alex@jt.local"
          userInitials="AI"
          unreadCount={0}
          onOpenNotifications={vi.fn()}
          onLogout={vi.fn()}
        />
      </TestWrapper>,
    )

    fireEvent.click(screen.getByLabelText('Toggle Sidebar'))
    expect(handleOpenChange).toHaveBeenCalledWith(false)
  })

  it('handles notifications and logout actions', async () => {
    const handleNotifications = vi.fn()
    const handleLogout = vi.fn()
    const user = userEvent.setup()

    render(
      <TestWrapper>
        <AppHeader
          userName="Alex Ivanov"
          userEmail="alex@jt.local"
          userInitials="AI"
          unreadCount={1}
          onOpenNotifications={handleNotifications}
          onLogout={handleLogout}
        />
      </TestWrapper>,
    )

    fireEvent.click(screen.getByLabelText('Open notifications'))
    expect(handleNotifications).toHaveBeenCalledTimes(1)

    await user.click(screen.getByLabelText('Open profile menu'))
    await user.click(await screen.findByRole('menuitem', { name: 'Logout' }))
    expect(handleLogout).toHaveBeenCalledTimes(1)
  })
})
