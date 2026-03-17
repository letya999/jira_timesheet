import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { OrgPage } from './org-page';
import * as authHooks from '../../auth/hooks';
import * as orgHooks from '../hooks';
import * as usersHooks from '@/features/users/hooks';

// Mock hooks
vi.mock('../../auth/hooks', () => ({
  useCurrentUser: vi.fn(() => ({ data: { role: 'Admin' }, isLoading: false })),
}));

vi.mock('../hooks', () => ({
  useOrgTree: vi.fn(() => ({ data: [], isLoading: false })),
  useCreateOrgUnit: vi.fn(() => ({ mutate: vi.fn(), isPending: false })),
  useUpdateOrgUnit: vi.fn(() => ({ mutate: vi.fn(), isPending: false })),
  useDeleteOrgUnit: vi.fn(() => ({ mutate: vi.fn(), isPending: false })),
}));

vi.mock('@/features/users/hooks', () => ({
  useUsers: vi.fn(() => ({ data: { items: [] }, isLoading: false })),
}));

// Mock child components
vi.mock('@/components/shared/org-hierarchy-with-members', () => ({
  OrgHierarchyWithMembers: () => <div data-testid="org-hierarchy">Org Hierarchy</div>,
}));

vi.mock('../components/unit-form', () => ({
  UnitForm: () => <div data-testid="unit-form">Unit Form</div>
}));

vi.mock('../components/role-manager', () => ({
  RoleManager: () => <div data-testid="role-manager">Role Manager</div>
}));

vi.mock('../components/unit-role-assignments', () => ({
  UnitRoleAssignments: () => <div data-testid="unit-role-assignments">Role Assignments</div>
}));

vi.mock('../components/approval-workflow-config', () => ({
  ApprovalWorkflowConfig: () => <div data-testid="approval-workflow-config">Workflow Config</div>
}));

vi.mock('@tanstack/react-router', async (importOriginal) => ({
  ...await importOriginal(),
  Navigate: ({ to }: { to: string }) => <div data-testid="navigate">Redirect to {to}</div>,
}));

describe('OrgPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(authHooks.useCurrentUser).mockReturnValue({ data: { role: 'Admin' }, isLoading: false } as any);
    vi.mocked(orgHooks.useOrgTree).mockReturnValue({ data: [], isLoading: false } as any);
    vi.mocked(usersHooks.useUsers).mockReturnValue({ data: { items: [] }, isLoading: false } as any);
  });

  it('redirects to root when user is not Admin', () => {
    vi.mocked(authHooks.useCurrentUser).mockReturnValue({ data: { role: 'User' }, isLoading: false } as any);
    
    render(<OrgPage />);
    expect(screen.getByTestId('navigate')).toBeDefined();
    expect(screen.getByText('Redirect to /')).toBeDefined();
  });

  it('renders heading and tabs when user is Admin', () => {
    vi.mocked(authHooks.useCurrentUser).mockReturnValue({ data: { role: 'Admin' }, isLoading: false } as any);
    render(<OrgPage />);
    expect(screen.getByText('Organization & Roles Management')).toBeDefined();
    expect(screen.getByText('Company Hierarchy')).toBeDefined();
    expect(screen.getByText('Manage Structure & Roles')).toBeDefined();
    expect(screen.getByText('Approval Workflows')).toBeDefined();
  });

  it('shows loading state for auth', () => {
    vi.mocked(authHooks.useCurrentUser).mockReturnValue({ data: null, isLoading: true } as any);
    
    render(<OrgPage />);
    expect(screen.getByText('Loading permissions...')).toBeDefined();
  });

  it('renders hierarchy component in hierarchy tab', () => {
    vi.mocked(orgHooks.useOrgTree).mockReturnValue({
      data: [{ id: 1, name: 'Root Unit', parent_id: null, reporting_period: 'weekly' }],
      isLoading: false
    } as any);
    
    render(<OrgPage />);
    expect(screen.getByTestId('org-hierarchy')).toBeDefined();
  });
});
