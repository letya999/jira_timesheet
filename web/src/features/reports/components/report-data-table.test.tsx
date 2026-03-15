import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ReportDataTable } from './report-data-table';

// Mock DataTableOrganism to simplify testing the column definitions and data flow
vi.mock('@/components/shared/data-table-organism', () => ({
  DataTableOrganism: ({ data, columns }: any) => (
    <table>
      <thead>
        <tr>
          {columns.map((col: any) => (
            <th key={col.accessorKey}>{col.header}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {data.map((row: any, i: number) => (
          <tr key={i}>
            {columns.map((col: any) => {
              const val = row[col.accessorKey];
              // Simulate cell renderer
              if (col.cell) {
                const getValue = () => val;
                return <td key={col.accessorKey}>{col.cell({ getValue })}</td>;
              }
              return <td key={col.accessorKey}>{String(val ?? '—')}</td>;
            })}
          </tr>
        ))}
      </tbody>
    </table>
  ),
}));

describe('ReportDataTable', () => {
  it('renders "No data" empty state when data is empty', () => {
    render(<ReportDataTable data={[]} columns={[]} />);
    expect(screen.getByText(/no data to display/i)).toBeDefined();
  });

  it('renders column headers derived from columns prop', () => {
    render(<ReportDataTable data={[{ user: 'Alice' }]} columns={['user', 'value']} />);
    expect(screen.getByText('User')).toBeDefined();
    expect(screen.getByText('Value')).toBeDefined();
  });

  it('renders column headers from first row keys when columns prop is empty', () => {
    render(<ReportDataTable data={[{ project: 'A' }]} columns={[]} />);
    expect(screen.getByText('Project')).toBeDefined();
  });

  it('renders data rows', () => {
    render(<ReportDataTable data={[{ user: 'Alice', value: 8 }]} columns={['user', 'value']} />);
    expect(screen.getByText('Alice')).toBeDefined();
  });

  it('numeric "value" and "hours" fields are formatted with 1 decimal place', () => {
    render(<ReportDataTable data={[{ value: 8, hours: 7.56 }]} columns={['value', 'hours']} />);
    // Use regex to match either . or , as decimal separator
    expect(screen.getByText(/8[.,]0/)).toBeDefined();
    expect(screen.getByText(/7[.,]6/)).toBeDefined();
  });

  it('non-numeric fields rendered as strings', () => {
    render(<ReportDataTable data={[{ user: 'Alice' }]} columns={['user']} />);
    expect(screen.getByText('Alice')).toBeDefined();
  });

  it('handles undefined/null values showing —', () => {
    render(<ReportDataTable data={[{ user: null }]} columns={['user']} />);
    expect(screen.getByText('—')).toBeDefined();
  });
});
