import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { EmployeesPage } from './employees-page';
import * as usersHooks from '../../users/hooks';

// Mock hooks
vi.mock('../../users/hooks', () => ({
  useJiraUsers: vi.fn(() => ({ data: { items: [], total: 0 }, isLoading: false })),
  useUpdateJiraUser: vi.fn(() => ({ mutate: vi.fn(), isPending: false })),
  useSyncUsersFromJira: vi.fn(() => ({ mutate: vi.fn(), isPending: false })),
  usePromoteUser: vi.fn(() => ({ mutate: vi.fn(), isPending: false })),
}));

vi.mock('../../org/hooks', () => ({
  useOrgTree: vi.fn(() => ({ data: [], isLoading: false })),
}));

vi.mock('../../auth/hooks', () => ({
  useCurrentUser: vi.fn(() => ({ data: { role: 'Admin' }, isLoading: false })),
}));

// Mock child components
vi.mock('@/components/ui/data-table', () => ({
  DataTable: ({ data }: any) => <div data-testid="data-table">Employees: {data?.length || 0}</div>
}));

vi.mock('../components/employee-hierarchy', () => ({
  EmployeeHierarchy: () => <div data-testid="employee-hierarchy">Hierarchy View</div>
}));

vi.mock('../components/temp-password-dialog', () => ({
  TempPasswordDialog: () => <div data-testid="temp-password-dialog">Dialog</div>
}));

describe('EmployeesPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders "Employees" heading', () => {
    render(<EmployeesPage />);
    expect(screen.getByText('Employees')).toBeDefined();
  });

  it('renders "Sync from Jira" button', () => {
    render(<EmployeesPage />);
    expect(screen.getByText('Sync from Jira')).toBeDefined();
  });

  it('renders both List and Hierarchy tabs', () => {
    render(<EmployeesPage />);
    expect(screen.getByText('List View')).toBeDefined();
    expect(screen.getByText('Hierarchy View')).toBeDefined();
  });

  it('shows skeleton while loading', () => {
    vi.mocked(usersHooks.useJiraUsers).mockReturnValue({ data: null, isLoading: true } as any);
    
    render(<EmployeesPage />);
    expect(screen.queryByTestId('data-table')).toBeNull();
  });

  it('switches to hierarchy view when tab clicked', async () => {
    const user = userEvent.setup();
    render(<EmployeesPage />);
    const hierarchyTab = screen.getByRole('tab', { name: /hierarchy view/i });

    await user.click(hierarchyTab);

    await waitFor(() => {
      expect(hierarchyTab.getAttribute('data-state')).toBe('active');
    });
  });

  it('updates search state when input changes', () => {
    render(<EmployeesPage />);
    const input = screen.getByPlaceholderText('Search employees...') as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'Alice' } });
    expect(input.value).toBe('Alice');
  });
});
