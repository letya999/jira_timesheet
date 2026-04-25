import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { LoginForm } from './login-form'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'

// Mock react-i18next
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: {
      language: 'en',
      changeLanguage: vi.fn(),
    },
  }),
}))

// Mock auth hooks
const mockGoogleLogin = vi.fn()
const mockSsoLogin = vi.fn()
const mockLogin = vi.fn()

vi.mock('@/features/auth/hooks', () => ({
  useLogin: () => ({
    mutateAsync: mockLogin,
    isPending: false,
    error: null,
  }),
  useGoogleLogin: () => mockGoogleLogin,
  useSsoLogin: () => mockSsoLogin,
}))

// Mock shadcn components or other complex subcomponents if needed
// For now, let's see if the basic render works

describe('LoginForm', () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })

  const renderForm = () =>
    render(
      <QueryClientProvider client={queryClient}>
        <LoginForm onSuccess={() => {}} />
      </QueryClientProvider>
    )

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders correctly with Google and SSO buttons', () => {
    renderForm()
    
    // Check main title and inputs
    expect(screen.getAllByText('auth.sign_in')).toHaveLength(2)
    expect(screen.getByLabelText(/auth.username/i)).toBeDefined()
    expect(screen.getByLabelText(/auth.password/i)).toBeDefined()
    
    // Check divider
    expect(screen.getByTestId('login-divider')).toBeDefined()
    expect(screen.getByText('auth.or')).toBeDefined()

    // Check Google Button
    const googleButton = screen.getByTestId('google-button')
    expect(googleButton).toBeDefined()
    expect(googleButton).toHaveTextContent('auth.sign_in_with_google')

    // Check SSO Button
    const ssoButton = screen.getByTestId('sso-button')
    expect(ssoButton).toBeDefined()
    expect(ssoButton).toHaveTextContent('auth.sign_in_with_sso')
  })

  it('calls googleLogin when Google button is clicked', () => {
    renderForm()
    const googleButton = screen.getByTestId('google-button')
    fireEvent.click(googleButton)
    expect(mockGoogleLogin).toHaveBeenCalledTimes(1)
  })

  it('calls ssoLogin when SSO button is clicked', () => {
    renderForm()
    const ssoButton = screen.getByTestId('sso-button')
    fireEvent.click(ssoButton)
    expect(mockSsoLogin).toHaveBeenCalledTimes(1)
  })
})
