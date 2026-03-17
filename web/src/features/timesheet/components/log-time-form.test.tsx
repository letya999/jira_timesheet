import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { LogTimeForm } from './log-time-form'

vi.mock('@/hooks/use-debounce', () => ({
  useDebounce: <T,>(value: T) => value,
}))

vi.mock('@/features/auth/hooks', () => ({
  useCurrentUser: vi.fn(() => ({ data: { jira_user_id: 10 } })),
}))

vi.mock('@/features/reports/hooks', () => ({
  useReportCategories: vi.fn(() => ({ data: [{ id: 1, name: 'Meeting' }] })),
}))

vi.mock('@/api/generated/sdk.gen', () => ({
  getEmployeesApiV1OrgEmployeesGet: vi.fn(),
  searchProjectIssuesApiV1ProjectsIssuesGet: vi.fn(),
  createManualLogApiV1TimesheetManualPost: vi.fn(),
}))

import {
  createManualLogApiV1TimesheetManualPost,
  getEmployeesApiV1OrgEmployeesGet,
  searchProjectIssuesApiV1ProjectsIssuesGet,
} from '@/api/generated/sdk.gen'

function renderForm() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: Infinity },
      mutations: { retry: false },
    },
  })

  return render(
    <QueryClientProvider client={queryClient}>
      <LogTimeForm />
    </QueryClientProvider>,
  )
}

describe('LogTimeForm', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(getEmployeesApiV1OrgEmployeesGet).mockResolvedValue({
      data: { items: [{ id: 10, display_name: 'Alice' }] },
    } as never)
    vi.mocked(createManualLogApiV1TimesheetManualPost).mockResolvedValue({
      data: { id: 1 },
    } as never)
  })

  it('shows manual category field when MANUAL type is selected', async () => {
    const user = userEvent.setup()
    renderForm()

    await waitFor(() => expect(getEmployeesApiV1OrgEmployeesGet).toHaveBeenCalled())

    const typeLabel = screen.getByText('Type')
    const typeTrigger = typeLabel.parentElement?.querySelector('button')
    expect(typeTrigger).toBeTruthy()
    await user.click(typeTrigger!)
    const manualItems = await screen.findAllByText('MANUAL')
    await user.click(manualItems[manualItems.length - 1]!)

    expect(screen.getByText('Category')).toBeInTheDocument()
    expect(screen.queryByText('Task Search')).not.toBeInTheDocument()

    const categoryTrigger = screen.getByText('Category').parentElement?.querySelector('button')
    expect(categoryTrigger).toBeTruthy()
    await user.click(categoryTrigger!)
    const meetingItems = await screen.findAllByText('Meeting')
    expect(meetingItems.length).toBeGreaterThan(0)
  })

  it('submits jira worklog with selected issue', async () => {
    const user = userEvent.setup()
    vi.mocked(searchProjectIssuesApiV1ProjectsIssuesGet).mockResolvedValue({
      data: [{ id: 77, key: 'ABC-1', summary: 'Implement feature' }],
    } as never)

    renderForm()

    await waitFor(() => expect(getEmployeesApiV1OrgEmployeesGet).toHaveBeenCalled())

    const selectTaskLabel = screen.getAllByText('Select Task')[0]
    const taskTrigger = selectTaskLabel.parentElement?.querySelector('button')
    expect(taskTrigger).toBeTruthy()
    await user.click(taskTrigger!)
    await user.type(screen.getByPlaceholderText('Issue key, title or Jira URL'), 'ABC')
    await waitFor(() => expect(searchProjectIssuesApiV1ProjectsIssuesGet).toHaveBeenCalled())
    const issueItems = await screen.findAllByText('ABC-1 - Implement feature')
    await user.click(issueItems[issueItems.length - 1]!)

    await user.type(screen.getByPlaceholderText('What did you do?'), 'Implemented endpoint')
    await user.click(screen.getByRole('button', { name: 'Submit Worklog' }))

    await waitFor(() =>
      expect(createManualLogApiV1TimesheetManualPost).toHaveBeenCalledWith(
        expect.objectContaining({
          body: expect.objectContaining({
            issue_id: 77,
            user_id: 10,
            category: 'Development',
          }),
        }),
      ),
    )
  })

  it('keeps submit disabled until required fields are set', async () => {
    renderForm()

    const submitButton = screen.getByRole('button', { name: 'Submit Worklog' })
    expect(submitButton).toBeDisabled()
  })
})
