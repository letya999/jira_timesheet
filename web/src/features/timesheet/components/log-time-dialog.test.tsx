import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { LogTimeDialog } from './log-time-dialog'

vi.mock('./log-time-form', () => ({
  LogTimeForm: () => <div data-testid="log-time-form">form</div>,
}))

describe('LogTimeDialog', () => {
  it('renders title and form when open', () => {
    render(<LogTimeDialog open onOpenChange={vi.fn()} />)

    expect(screen.getByText('Log Time')).toBeInTheDocument()
    expect(screen.getByTestId('log-time-form')).toBeInTheDocument()
  })
})
