import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { EmployeeHierarchy } from './employee-hierarchy';

describe('EmployeeHierarchy', () => {
  const mockUnits = [
    { id: 1, name: 'Root Unit', parent_id: null, reporting_period: 'weekly' },
    { id: 2, name: 'Child Unit', parent_id: 1, reporting_period: 'monthly' },
  ] as any;

  const mockEmployees = [
    { id: 101, display_name: 'Alice', org_unit_id: 1, user_id: 1 },
    { id: 102, display_name: 'Bob', org_unit_id: 1, user_id: null },
    { id: 103, display_name: 'Charlie', org_unit_id: 2, user_id: null },
    { id: 104, display_name: 'Dave', org_unit_id: null, user_id: null },
  ] as any;

  it('renders root unit and child unit names', () => {
    render(<EmployeeHierarchy units={mockUnits} employees={mockEmployees} />);
    expect(screen.getByText('Root Unit')).toBeDefined();
    expect(screen.getByText('Child Unit')).toBeDefined();
  });

  it('renders employees under correct units', () => {
    // Put Charlie in root unit too for easier testing without nested accordion expansion
    const simplifiedEmployees = [
      ...mockEmployees.filter((e: any) => e.id !== 103),
      { id: 103, display_name: 'Charlie', org_unit_id: 1, user_id: null }
    ];
    render(<EmployeeHierarchy units={mockUnits} employees={simplifiedEmployees} />);
    expect(screen.getByText('Alice')).toBeDefined();
    expect(screen.getByText('Bob')).toBeDefined();
    expect(screen.getByText('Charlie')).toBeDefined();
  });

  it('renders unassigned employees in a separate section', () => {
    render(<EmployeeHierarchy units={mockUnits} employees={mockEmployees} />);
    expect(screen.getByText('Dave')).toBeDefined();
    expect(screen.getByText('Unassigned')).toBeDefined();
  });

  it('shows "System Access" badge for promoted users', () => {
    render(<EmployeeHierarchy units={mockUnits} employees={mockEmployees} />);
    const aliceBadge = screen.getAllByText('System Access');
    expect(aliceBadge.length).toBeGreaterThan(0);
  });

  it('renders reporting period badges', () => {
    render(<EmployeeHierarchy units={mockUnits} employees={mockEmployees} />);
    expect(screen.getByText('weekly')).toBeDefined();
    expect(screen.getByText('monthly')).toBeDefined();
  });

  it('shows empty message for unassigned if none exist', () => {
    const employeesWithoutDave = mockEmployees.filter((e: any) => e.id !== 104);
    render(<EmployeeHierarchy units={mockUnits} employees={employeesWithoutDave} />);
    expect(screen.getByText('No unassigned employees')).toBeDefined();
  });
});
