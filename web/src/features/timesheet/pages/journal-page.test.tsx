import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import JournalPage from './journal-page'

vi.mock('@/features/auth/hooks', () => ({
  useCurrentUser: vi.fn(() => ({ data: { role: 'Admin' } })),
}))

vi.mock('@/features/reports/hooks', () => ({
  useReportCategories: vi.fn(() => ({ data: [] })),
  useReportOrgUnits: vi.fn(() => ({ data: [] })),
  useReportProjects: vi.fn(() => ({ data: [] })),
}))

vi.mock('@/features/timesheet/hooks', () => ({
  useTimesheetEntries: vi.fn(() => ({
    data: { items: [], total: 0 },
    isLoading: false,
    isFetching: false,
  })),
}))

vi.mock('@/components/shared/card-list', () => ({
  CardList: () => <div data-testid="card-list">list</div>,
}))

vi.mock('@/features/timesheet/components/log-time-dialog', () => ({
  LogTimeDialog: ({ open }: { open: boolean }) =>
    open ? <div data-testid="log-time-dialog">dialog</div> : null,
}))

function renderPage() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: Infinity },
      mutations: { retry: false },
    },
  })

  return render(
    <QueryClientProvider client={queryClient}>
      <JournalPage />
    </QueryClientProvider>,
  )
}

describe('JournalPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('opens log-time dialog when log-time button is clicked', async () => {
    const user = userEvent.setup()
    renderPage()

    await user.click(screen.getByRole('button', { name: 'Log Time' }))
    expect(screen.getByTestId('log-time-dialog')).toBeInTheDocument()
  })
})
