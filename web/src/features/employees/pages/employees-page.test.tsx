import { render, screen } from '@testing-library/react';
import { EmployeesPage } from './employees-page';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Mock UserType
vi.mock('@/api/generated/types.gen', async (importOriginal) => {
  const actual = await importOriginal<any>();
  return {
    ...actual,
    UserType: {
      SYSTEM: 'system',
      IMPORT: 'import',
    },
  };
});

// Mock hooks
vi.mock('@/features/users/hooks', () => ({
  useUsers: vi.fn(() => ({ data: { items: [], total: 0 }, isLoading: false })),
  useResetPassword: vi.fn(() => ({ mutate: vi.fn() })),
  useSyncUsersFromJira: vi.fn(() => ({ mutate: vi.fn(), isPending: false })),
  useDeleteUser: vi.fn(() => ({ mutate: vi.fn() })),
  useBulkUpdateUsers: vi.fn(() => ({ mutate: vi.fn() })),
  useUpdateUser: vi.fn(() => ({ mutate: vi.fn() })),
  usePromoteUser: vi.fn(() => ({ mutate: vi.fn() })),
  useMergeUsers: vi.fn(() => ({ mutate: vi.fn() })),
}));

vi.mock('@/features/org/hooks', () => ({
  useOrgTree: vi.fn(() => ({ data: [], isLoading: false })),
}));

vi.mock('@/features/auth/hooks', () => ({
  useCurrentUser: vi.fn(() => ({ data: { role: 'Admin' } })),
}));

// Mock DataTable since it's complex
vi.mock('@/components/ui/data-table', () => ({
  DataTable: () => <div data-testid="data-table">Data Table</div>,
}));

describe('EmployeesPage', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient();
  });

  it('renders employees page title', () => {
    render(
      <QueryClientProvider client={queryClient}>
        <EmployeesPage />
      </QueryClientProvider>
    );
    expect(screen.getByText('Employees')).toBeDefined();
  });

  it('shows sync button', () => {
    render(
      <QueryClientProvider client={queryClient}>
        <EmployeesPage />
      </QueryClientProvider>
    );
    expect(screen.getByText('Sync from Jira')).toBeDefined();
  });

  it('renders tabs', () => {
    render(
      <QueryClientProvider client={queryClient}>
        <EmployeesPage />
      </QueryClientProvider>
    );
    expect(screen.getByText('List View')).toBeDefined();
    expect(screen.getByText('Hierarchy View')).toBeDefined();
  });
});
