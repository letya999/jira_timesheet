import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ReportMetricsBar } from './report-metrics-bar';

describe('ReportMetricsBar', () => {
  const mockRows = [
    { value: 8, hours: 8, user: 'Alice', task: 'BE-101' },
    { value: 6, hours: 6, user: 'Bob', task: 'BE-202' },
    { value: 4, hours: 4, user: 'Alice', task: 'BE-101' },
  ];

  it('renders 4 stat cards', () => {
    render(<ReportMetricsBar data={mockRows} format="hours" />);
    expect(screen.getByText('Grand Total')).toBeDefined();
    expect(screen.getByText('Total Hours')).toBeDefined();
    expect(screen.getByText('Employees')).toBeDefined();
    expect(screen.getByText('Unique Tasks')).toBeDefined();
  });

  it('calculates metrics correctly for hours format', () => {
    render(<ReportMetricsBar data={mockRows} format="hours" />);
    // Total value: 8 + 6 + 4 = 18
    // Total hours: 8 + 6 + 4 = 18
    // Both Grand Total and Total Hours will be "18h"
    expect(screen.getAllByText('18h')).toHaveLength(2);
    // Unique employees: Alice, Bob = 2
    // Unique tasks: BE-101, BE-202 = 2
    expect(screen.getAllByText('2')).toHaveLength(2);
  });

  it('calculates metrics correctly for days format', () => {
    const dayRows = [
      { value: 1, hours: 8, user: 'Alice', task: 'BE-101' },
      { value: 0.5, hours: 4, user: 'Bob', task: 'BE-202' },
    ];
    render(<ReportMetricsBar data={dayRows} format="days" />);
    // Grand total: 1 + 0.5 = 1.5d
    expect(screen.getByText(/1[.,]5d/)).toBeDefined();
    // Total hours: 8 + 4 = 12h
    expect(screen.getByText('12h')).toBeDefined();
  });

  it('handles empty data gracefully', () => {
    render(<ReportMetricsBar data={[]} format="hours" />);
    expect(screen.getAllByText('0h').length).toBe(2);
    expect(screen.getAllByText('0').length).toBe(2);
  });

  it('handles rows with missing fields', () => {
    const invalidRows = [
      { value: 'invalid', hours: null, user: undefined, task: {} },
    ];
    render(<ReportMetricsBar data={invalidRows as any} format="hours" />);
    expect(screen.getAllByText('0h').length).toBe(2);
    // Unique users: [undefined] has size 1
    // Unique tasks: [{}] has size 1
    expect(screen.getAllByText('1').length).toBe(2);
  });
});
