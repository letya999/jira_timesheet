import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import LogTimePage from './log-time-page'

const navigateMock = vi.fn()
const logoutMutateMock = vi.fn()
let isAuthenticated = false

vi.mock('@tanstack/react-router', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@tanstack/react-router')>()),
  useRouter: () => ({ navigate: navigateMock }),
}))

vi.mock('@/stores/auth-store', () => ({
  useAuthStore: (selector: (state: { isAuthenticated: boolean }) => boolean) =>
    selector({ isAuthenticated }),
}))

vi.mock('@/features/auth/hooks', () => ({
  useCurrentUser: vi.fn(() => ({ data: { display_name: 'Alice', email: 'alice@test.local' } })),
  useLogout: vi.fn(() => ({ mutate: logoutMutateMock })),
}))

vi.mock('@/features/auth/components/login-form', () => ({
  LoginForm: () => <div data-testid="login-form">login</div>,
}))

vi.mock('@/features/timesheet/components/log-time-form', () => ({
  LogTimeForm: () => <div data-testid="log-time-form">form</div>,
}))

describe('LogTimePage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    isAuthenticated = false
  })

  it('shows login form for unauthenticated users', () => {
    render(<LogTimePage />)
    expect(screen.getByTestId('login-form')).toBeInTheDocument()
  })

  it('shows log-time page content for authenticated users', async () => {
    const user = userEvent.setup()
    isAuthenticated = true

    render(<LogTimePage />)

    expect(screen.getByTestId('log-time-form')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Open app' }))
    expect(navigateMock).toHaveBeenCalledWith({ to: '/app/my-timesheet' })
  })

  it('shows theme and language controls in profile menu', async () => {
    const user = userEvent.setup()
    isAuthenticated = true

    render(<LogTimePage />)

    await user.click(screen.getByRole('button', { name: 'Open profile menu' }))
    expect(await screen.findByRole('menuitem', { name: 'Light' })).toBeInTheDocument()
    expect(screen.getByRole('menuitem', { name: /English/ })).toBeInTheDocument()
    expect(screen.getByRole('menuitem', { name: 'Russian' })).toBeInTheDocument()
  })
})
