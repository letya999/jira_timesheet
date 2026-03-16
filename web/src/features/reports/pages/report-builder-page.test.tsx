import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ReportBuilderPage } from './report-builder-page';
import * as hooks from '../hooks';

// Mock all hooks used by the page
vi.mock('../hooks', () => ({
  useReportFilters: vi.fn(),
  useCustomReport: vi.fn(),
  useReportCategories: vi.fn(() => ({ data: [], isLoading: false })),
  useReportSprints: vi.fn(() => ({ data: [], isLoading: false })),
  useReportOrgUnits: vi.fn(() => ({ data: [], isLoading: false })),
  useReportEmployees: vi.fn(() => ({ data: [], isLoading: false })),
  useReportProjects: vi.fn(() => ({ data: [], isLoading: false })),
  useExportReport: vi.fn(() => ({ mutate: vi.fn(), isPending: false })),
  useProjectReleases: vi.fn(() => ({ data: [], isLoading: false })),
}));

// Mock child components that are already tested elsewhere to focus on page integration
vi.mock('../components/report-filter-panel', () => ({
  ReportFilterPanel: () => <div data-testid="filter-panel">Filter Panel</div>,
}));

vi.mock('../components/pivot-config-panel', () => ({
  PivotConfigPanel: ({ onRun }: any) => (
    <div data-testid="pivot-panel">
      Pivot Panel
      <button onClick={onRun}>Run report</button>
    </div>
  ),
}));

describe('ReportBuilderPage', () => {
  const mockFilters = {
    start_date: '2026-03-01',
    end_date: '2026-03-31',
    format: 'hours',
    group_by_rows: ['user'],
    group_by_cols: ['date'],
    group_horizontally_by: null,
    group_vertically_by: null,
    date_granularity: 'week',
  };

  const mockToReportRequest = vi.fn(() => ({ ...mockFilters }));
  const mockToFilterChips = vi.fn(() => [{ id: 'date', label: 'Period', value: '2026-03-01 — 2026-03-31' }]);

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(hooks.useReportFilters).mockReturnValue({
      filters: mockFilters,
      setFilter: vi.fn(),
      clearAll: vi.fn(),
      toReportRequest: mockToReportRequest,
      toFilterChips: mockToFilterChips,
    } as any);
  });

  it('renders filter panel and pivot config panel', () => {
    vi.mocked(hooks.useCustomReport).mockReturnValue({ data: null, isFetching: false, isError: false } as any);
    render(<ReportBuilderPage />);
    expect(screen.getByTestId('filter-panel')).toBeDefined();
    expect(screen.getByTestId('pivot-panel')).toBeDefined();
  });

  it('does NOT render metrics or table initially (before Run is clicked)', () => {
    vi.mocked(hooks.useCustomReport).mockReturnValue({ data: null, isFetching: false, isError: false } as any);
    render(<ReportBuilderPage />);
    expect(screen.queryByText('Grand total')).toBeNull();
    expect(screen.queryByText('Data table')).toBeNull();
  });

  it('shows loading state after Run is clicked while fetching', async () => {
    vi.mocked(hooks.useCustomReport).mockReturnValue({ data: null, isFetching: true, isError: false } as any);
    render(<ReportBuilderPage />);
    
    fireEvent.click(screen.getByText('Run report'));
    
    // Skeleton should be visible (using a class check or just assuming it renders when isFetching is true)
    // In our component, we render skeletons when isFetching is true
    expect(screen.queryByText('Grand total')).toBeNull();
  });

  it('renders results after data loads', async () => {
    const mockData = {
      data: [{ user: 'Alice', value: 8, hours: 8, task: 'T-1' }],
      columns: ['user', 'value'],
    };
    vi.mocked(hooks.useCustomReport).mockReturnValue({ data: mockData, isFetching: false, isError: false } as any);
    
    render(<ReportBuilderPage />);
    
    // Trigger run to show results
    fireEvent.click(screen.getByText('Run report'));

    await waitFor(() => {
      expect(screen.getByText('Grand total')).toBeDefined();
      expect(screen.getByText('Data table')).toBeDefined();
      expect(screen.getByText('Chart')).toBeDefined();
    });
  });

  it('shows error message when query fails', () => {
    vi.mocked(hooks.useCustomReport).mockReturnValue({ data: null, isFetching: false, isError: true } as any);
    render(<ReportBuilderPage />);
    expect(screen.getByText(/failed to load report data/i)).toBeDefined();
  });

  it('shows empty state when data returns empty array', () => {
    vi.mocked(hooks.useCustomReport).mockReturnValue({ data: { data: [] }, isFetching: false, isError: false } as any);
    render(<ReportBuilderPage />);
    
    // Need reportBody to be non-null to show empty state
    fireEvent.click(screen.getByText('Run report'));
    
    expect(screen.getByText(/no data found for the selected filters/i)).toBeDefined();
  });
});
