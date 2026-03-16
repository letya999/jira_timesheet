import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ProjectRow } from './project-row';
import * as projectsHooks from '../hooks';

// Mock hooks
vi.mock('../hooks', () => ({
  useUpdateProject: vi.fn(() => ({ mutate: vi.fn(), isPending: false })),
  useSyncProjects: vi.fn(() => ({ mutate: vi.fn(), isPending: false })),
  useProjectSyncStatus: vi.fn(() => ({ data: null, isLoading: false })),
}));

describe('ProjectRow', () => {
  const mockProject = {
    id: 1,
    jira_id: 'P1',
    key: 'PROJ',
    name: 'My Project',
    is_active: true,
    created_at: '',
    updated_at: ''
  } as any;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders project key and name', () => {
    render(<ProjectRow project={mockProject} />);
    expect(screen.getByText('PROJ')).toBeDefined();
    expect(screen.getByText('My Project')).toBeDefined();
  });

  it('calls updateProject mutation when toggle clicked', () => {
    const mutate = vi.fn();
    vi.mocked(projectsHooks.useUpdateProject).mockReturnValue({ mutate, isPending: false } as any);
    
    render(<ProjectRow project={mockProject} />);
    const switch_ = screen.getByRole('switch');
    fireEvent.click(switch_);
    
    expect(mutate).toHaveBeenCalledWith(
      { id: 1, data: { is_active: false } },
      expect.any(Object)
    );
  });

  it('calls syncSingleProject mutation when Sync Now clicked', () => {
    const mutate = vi.fn();
    vi.mocked(projectsHooks.useSyncProjects).mockReturnValue({ mutate, isPending: false } as any);
    
    render(<ProjectRow project={mockProject} />);
    const syncButton = screen.getByText('Sync Now');
    fireEvent.click(syncButton);
    
    expect(mutate).toHaveBeenCalledWith(1, expect.any(Object));
  });

  it('disables Sync Now button when project is inactive', () => {
    render(<ProjectRow project={{ ...mockProject, is_active: false }} />);
    const syncButton = screen.getByText('Sync Now');
    expect(syncButton.hasAttribute('disabled')).toBe(true);
  });

  it('shows syncing state', () => {
    vi.mocked(projectsHooks.useSyncProjects).mockReturnValue({ mutate: vi.fn(), isPending: true } as any);
    
    render(<ProjectRow project={mockProject} />);
    expect(screen.getByText('Syncing...')).toBeDefined();
  });

  it('shows success state after sync complete', () => {
    vi.mocked(projectsHooks.useProjectSyncStatus).mockReturnValue({ data: { status: 'complete' }, isLoading: false } as any);
    
    render(<ProjectRow project={mockProject} />);
    expect(screen.getByText('Synced')).toBeDefined();
  });
});
