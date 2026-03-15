import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { PivotConfigPanel } from './pivot-config-panel';
import type { ReportFilters } from '../hooks/use-report-filters';

const defaultFilters: ReportFilters = {
  start_date: '2026-03-01',
  end_date: '2026-03-31',
  project_id: null,
  release_id: null,
  org_unit_id: null,
  user_ids: [],
  sprint_ids: [],
  worklog_types: [],
  category_ids: [],
  group_by_rows: ['user', 'project'],
  group_by_cols: ['date'],
  date_granularity: 'week',
  format: 'hours',
  hours_per_day: 8,
};

describe('PivotConfigPanel', () => {
  it('renders row and column dimensions multiselects', () => {
    render(
      <PivotConfigPanel
        filters={defaultFilters}
        onFilter={vi.fn()}
        onRun={vi.fn()}
      />
    );
    expect(screen.getByText('Row dimensions')).toBeDefined();
    expect(screen.getByText('Column dimensions')).toBeDefined();
  });

  it('renders "Run report" button', () => {
    render(
      <PivotConfigPanel
        filters={defaultFilters}
        onFilter={vi.fn()}
        onRun={vi.fn()}
      />
    );
    expect(screen.getByRole('button', { name: /run report/i })).toBeDefined();
  });

  it('Run button is disabled when group_by_rows is empty', () => {
    const filters = { ...defaultFilters, group_by_rows: [] };
    render(
      <PivotConfigPanel
        filters={filters}
        onFilter={vi.fn()}
        onRun={vi.fn()}
      />
    );
    expect(screen.getByRole('button', { name: /run report/i })).toBeDisabled();
    expect(screen.getByText(/at least one row dimension is required/i)).toBeDefined();
  });

  it('shows overlap error when same dimension in both rows and cols', () => {
    const filters = { ...defaultFilters, group_by_rows: ['user'], group_by_cols: ['user'] };
    render(
      <PivotConfigPanel
        filters={filters}
        onFilter={vi.fn()}
        onRun={vi.fn()}
      />
    );
    expect(screen.getByRole('button', { name: /run report/i })).toBeDisabled();
    expect(screen.getByText(/dimension conflict: user/i)).toBeDefined();
  });

  it('shows date granularity controls when "date" is in group_by_cols', () => {
    render(
      <PivotConfigPanel
        filters={defaultFilters}
        onFilter={vi.fn()}
        onRun={vi.fn()}
      />
    );
    expect(screen.getByText('Date granularity')).toBeDefined();
    expect(screen.getByText('Week')).toBeDefined();
  });

  it('hides date granularity controls when "date" is not in rows or cols', () => {
    const filters = { ...defaultFilters, group_by_cols: [] };
    render(
      <PivotConfigPanel
        filters={filters}
        onFilter={vi.fn()}
        onRun={vi.fn()}
      />
    );
    expect(screen.queryByText('Date granularity')).toBeNull();
  });

  it('shows hours_per_day input when format is "days"', () => {
    const filters = { ...defaultFilters, format: 'days' as const };
    render(
      <PivotConfigPanel
        filters={filters}
        onFilter={vi.fn()}
        onRun={vi.fn()}
      />
    );
    expect(screen.getByLabelText(/hours per day/i)).toBeDefined();
  });

  it('hides hours_per_day input when format is "hours"', () => {
    render(
      <PivotConfigPanel
        filters={defaultFilters}
        onFilter={vi.fn()}
        onRun={vi.fn()}
      />
    );
    expect(screen.queryByLabelText(/hours per day/i)).toBeNull();
  });

  it('calls onRun when Run button is clicked', () => {
    const onRun = vi.fn();
    render(
      <PivotConfigPanel
        filters={defaultFilters}
        onFilter={vi.fn()}
        onRun={onRun}
      />
    );
    fireEvent.click(screen.getByRole('button', { name: /run report/i }));
    expect(onRun).toHaveBeenCalled();
  });

  it('calls onFilter when granularity button is clicked', () => {
    const onFilter = vi.fn();
    render(
      <PivotConfigPanel
        filters={defaultFilters}
        onFilter={onFilter}
        onRun={vi.fn()}
      />
    );
    fireEvent.click(screen.getByText('Month'));
    expect(onFilter).toHaveBeenCalledWith('date_granularity', 'month');
  });
});
