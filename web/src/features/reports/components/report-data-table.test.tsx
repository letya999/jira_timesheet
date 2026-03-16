import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ReportDataTable } from './report-data-table';

describe('ReportDataTable', () => {
  it('renders empty state when data is empty', () => {
    render(
      <ReportDataTable
        data={[]}
        rowDimensions={['user']}
        columnDimensions={['date']}
        groupHorizontallyBy={null}
        groupVerticallyBy={null}
        dateGranularity="week"
      />
    );
    expect(screen.getByText(/no results/i)).toBeDefined();
  });

  it('renders only selected row dimension headers', () => {
    render(
      <ReportDataTable
        data={[{ user: 'Alice', project: 'A', date: '2026-03-02', value: 8, issue_key: 'ISS-1' }]}
        rowDimensions={['user']}
        columnDimensions={['date']}
        groupHorizontallyBy={null}
        groupVerticallyBy={null}
        dateGranularity="week"
      />
    );

    expect(screen.getByText('User')).toBeDefined();
    expect(screen.queryByText('Project')).toBeNull();
    expect(screen.queryByText('Issue key')).toBeNull();
  });

  it('aggregates values and formats with one decimal', () => {
    render(
      <ReportDataTable
        data={[
          { user: 'Alice', date: '2026-03-02', value: 2 },
          { user: 'Alice', date: '2026-03-03', value: 3.25 },
        ]}
        rowDimensions={['user']}
        columnDimensions={[]}
        groupHorizontallyBy={null}
        groupVerticallyBy={null}
        dateGranularity="week"
      />
    );

    expect(screen.getByText('Total')).toBeDefined();
    expect(screen.getByText(/5[.,]3/)).toBeDefined();
  });

  it('renders nested headers for multiple column dimensions in selected order', () => {
    render(
      <ReportDataTable
        data={[
          { user: 'Alice', project: 'A', date: '2026-03-02', category: 'Dev', value: 8 },
          { user: 'Alice', project: 'A', date: '2026-03-09', category: 'QA', value: 4 },
        ]}
        rowDimensions={['user']}
        columnDimensions={['category', 'date']}
        groupHorizontallyBy={null}
        groupVerticallyBy={null}
        dateGranularity="week"
      />
    );

    expect(screen.getByText('Dev')).toBeDefined();
    expect(screen.getByText('QA')).toBeDefined();
    expect(screen.getByText('2026-03-02')).toBeDefined();
    expect(screen.getByText('2026-03-09')).toBeDefined();
  });

  it('moves horizontal grouping field out of rows to avoid duplicate row records', () => {
    render(
      <ReportDataTable
        data={[
          { user: 'Alexey Kuznetsov', task: '[Site] Task A', date: '2026-03-02', value: 26 },
          { user: 'Alexey Kuznetsov', task: '[Site] Task B', date: '2026-03-02', value: 0.5 },
        ]}
        rowDimensions={['user', 'task']}
        columnDimensions={['date']}
        groupHorizontallyBy="task"
        groupVerticallyBy={null}
        dateGranularity="week"
      />
    );

    expect(screen.getByText('User')).toBeDefined();
    expect(screen.queryByText('Task')).toBeNull();
    expect(screen.getByText('[Site] Task A')).toBeDefined();
    expect(screen.getByText('[Site] Task B')).toBeDefined();
    expect(screen.getAllByText('2026-03-02').length).toBe(2);
    expect(screen.getAllByText('Alexey Kuznetsov').length).toBe(1);
  });

  it('moves vertical grouping field out of columns and into rows', () => {
    render(
      <ReportDataTable
        data={[
          { user: 'Alexey Kuznetsov', task: 'Task A', date: '2026-03-02', value: 2 },
          { user: 'Alexey Kuznetsov', task: 'Task A', date: '2026-03-03', value: 3 },
        ]}
        rowDimensions={['user']}
        columnDimensions={['task', 'date']}
        groupHorizontallyBy={null}
        groupVerticallyBy="task"
        dateGranularity="week"
      />
    );

    expect(screen.getByText('Task')).toBeDefined();
    expect(screen.getByText('Task A')).toBeDefined();
    expect(screen.queryByText('Total')).toBeNull();
    expect(screen.getByText('2026-03-02')).toBeDefined();
    expect(screen.queryByText('2026-03-03')).toBeNull();
    expect(screen.getAllByText('Alexey Kuznetsov').length).toBe(1);
    expect(screen.getByText(/5[.,]0/)).toBeDefined();
  });

  it('renders vertical super-groups by merging repeated row header values', () => {
    render(
      <ReportDataTable
        data={[
          { user: 'Alexey Kuznetsov', task: 'Task A', date: '2026-03-02', value: 2 },
          { user: 'Alexey Kuznetsov', task: 'Task B', date: '2026-03-02', value: 3 },
        ]}
        rowDimensions={['user', 'task']}
        columnDimensions={['date']}
        groupHorizontallyBy={null}
        groupVerticallyBy={null}
        dateGranularity="week"
      />
    );

    expect(screen.getByText('User')).toBeDefined();
    expect(screen.getByText('Task')).toBeDefined();
    expect(screen.getByText('Task A')).toBeDefined();
    expect(screen.getByText('Task B')).toBeDefined();
    expect(screen.getAllByText('Alexey Kuznetsov').length).toBe(1);
  });
});
