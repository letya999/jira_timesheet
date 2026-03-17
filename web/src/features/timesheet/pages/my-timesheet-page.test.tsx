import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import MyTimesheetPage from './my-timesheet-page'

vi.mock('@/features/timesheet/hooks', () => ({
  useMyTimesheetEntries: vi.fn(() => ({
    data: [],
    isLoading: false,
  })),
}))

vi.mock('@/hooks/use-timezone', () => ({
  useTimezone: vi.fn(() => ({ timezone: 'Europe/Moscow' })),
}))

vi.mock('@/components/shared/pivot-table', () => ({
  PivotTable: () => <div data-testid="pivot-table">table</div>,
}))

vi.mock('@/features/timesheet/components/log-time-dialog', () => ({
  LogTimeDialog: ({ open }: { open: boolean }) =>
    open ? <div data-testid="log-time-dialog">dialog</div> : null,
}))

describe('MyTimesheetPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('opens log-time dialog when log-time button is clicked', async () => {
    const user = userEvent.setup()
    render(<MyTimesheetPage />)

    await user.click(screen.getByRole('button', { name: 'Log Time' }))
    expect(screen.getByTestId('log-time-dialog')).toBeInTheDocument()
  })
})
