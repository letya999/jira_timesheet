import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { SyncAllButton } from './sync-all-button';
import * as projectsHooks from '../hooks';

// Mock hooks
vi.mock('../hooks', () => ({
  useSyncProjects: vi.fn(() => ({ mutate: vi.fn(), isPending: false })),
  useProjectSyncStatus: vi.fn(() => ({ data: null, isLoading: false })),
}));

describe('SyncAllButton', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(projectsHooks.useSyncProjects).mockReturnValue({ mutate: vi.fn(), isPending: false } as any);
    vi.mocked(projectsHooks.useProjectSyncStatus).mockReturnValue({ data: null, isLoading: false } as any);
  });

  it('renders "Sync All Active Projects" button', () => {
    render(<SyncAllButton />);
    expect(screen.getByText('Sync All Active Projects')).toBeDefined();
  });

  it('calls syncAll mutation when clicked', () => {
    const mutate = vi.fn();
    vi.mocked(projectsHooks.useSyncProjects).mockReturnValue({ mutate, isPending: false } as any);
    
    render(<SyncAllButton />);
    const button = screen.getByText('Sync All Active Projects');
    fireEvent.click(button);
    
    expect(mutate).toHaveBeenCalledWith(undefined, expect.any(Object));
  });

  it('shows syncing state when mutation is pending', () => {
    vi.mocked(projectsHooks.useSyncProjects).mockReturnValue({ mutate: vi.fn(), isPending: true } as any);

    render(<SyncAllButton />);
    expect(screen.getByText('Syncing...')).toBeDefined();
    expect(screen.getByText('Syncing all projects')).toBeDefined();
  });

  it('shows progress when job is running', () => {
    vi.mocked(projectsHooks.useProjectSyncStatus).mockReturnValue({ data: { status: 'running', progress: 0.5 }, isLoading: false } as any);
    
    render(<SyncAllButton />);
    expect(screen.getByText(/50%/)).toBeDefined();
  });
});
