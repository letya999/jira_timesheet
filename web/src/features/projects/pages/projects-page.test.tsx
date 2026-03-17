import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ProjectsPage } from './projects-page';
import * as projectsHooks from '../hooks';

// Mock hooks
vi.mock('../hooks', () => ({
  useProjects: vi.fn(() => ({ data: { items: [], total: 0 }, isLoading: false })),
  useRefreshProjects: vi.fn(() => ({ mutate: vi.fn(), isPending: false })),
}));

// Mock child components
vi.mock('../components/project-row', () => ({
  ProjectRow: ({ project }: any) => <div data-testid="project-row">Project: {project.key}</div>
}));

vi.mock('../components/sync-all-button', () => ({
  SyncAllButton: () => <button data-testid="sync-all-button">Sync All Active Projects</button>
}));

vi.mock('@tanstack/react-router', async (importOriginal) => ({
  ...await importOriginal(),
  Link: ({ children, to }: any) => <a href={to}>{children}</a>,
}));

describe('ProjectsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders "Projects" heading', () => {
    render(<ProjectsPage />);
    expect(screen.getByText('Project Management')).toBeDefined();
  });

  it('renders search input', () => {
    render(<ProjectsPage />);
    expect(screen.getByPlaceholderText('Search Projects (Name or Key)')).toBeDefined();
  });

  it('renders "Refresh Projects from Jira" button', () => {
    render(<ProjectsPage />);
    expect(screen.getByText('Refresh Projects from Jira')).toBeDefined();
  });

  it('shows skeleton when loading', () => {
    vi.mocked(projectsHooks.useProjects).mockReturnValue({ data: null, isLoading: true } as any);
    
    render(<ProjectsPage />);
    expect(screen.queryByTestId('project-row')).toBeNull();
  });

  it('renders project rows when data is provided', () => {
    vi.mocked(projectsHooks.useProjects).mockReturnValue({
      data: {
        items: [
          { id: 1, key: 'P1', name: 'Project 1' },
          { id: 2, key: 'P2', name: 'Project 2' }
        ],
        total: 2
      },
      isLoading: false
    } as any);
    
    render(<ProjectsPage />);
    expect(screen.getAllByTestId('project-row')).toHaveLength(2);
    expect(screen.getByText('Project: P1')).toBeDefined();
    expect(screen.getByText('Project: P2')).toBeDefined();
  });

  it('shows "No projects found" when empty data', () => {
    vi.mocked(projectsHooks.useProjects).mockReturnValue({
      data: { items: [], total: 0 },
      isLoading: false
    } as any);
    render(<ProjectsPage />);
    expect(screen.getByText(/No projects found/)).toBeDefined();
  });

  it('updates search state when input changes', () => {
    render(<ProjectsPage />);
    const input = screen.getByPlaceholderText('Search Projects (Name or Key)') as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'TEST' } });
    expect(input.value).toBe('TEST');
  });
});
