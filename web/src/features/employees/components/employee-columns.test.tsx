import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { getEmployeeColumns } from './employee-columns';
import {
  flexRender,
  getCoreRowModel,
  useReactTable
} from '@tanstack/react-table';

const TestTable = ({ columns, data }: any) => {
  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <table>
      <tbody>
        {table.getRowModel().rows.map(row => (
          <tr key={row.id}>
            {row.getVisibleCells().map(cell => (
              <td key={cell.id}>
                {flexRender(cell.column.columnDef.cell, cell.getContext())}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
};

describe('employee-columns', () => {
  const mockOrgUnits = [
    { id: 1, name: 'Engineering', parent_id: null, reporting_period: 'weekly', created_at: '', updated_at: '' }
  ] as any;

  const mockEmployee = {
    id: 1,
    display_name: 'Alice',
    email: 'a@x.com',
    jira_account_id: 'J1',
    avatar_url: null,
    is_active: true,
    weekly_quota: 40,
    org_unit_id: 1,
    user_id: null,
    type: 'import',
  } as any;

  const defaultProps = {
    orgUnits: mockOrgUnits,
    onEdit: vi.fn(),
    onResetPassword: vi.fn(),
    onMerge: vi.fn(),
    onDelete: vi.fn(),
    isAdmin: false,
    t: (_key: string, fallback?: string) => fallback ?? _key,
  };

  it('renders employee display_name and email', () => {
    const columns = getEmployeeColumns(defaultProps);
    render(<TestTable columns={columns} data={[mockEmployee]} />);
    expect(screen.getByText('Alice')).toBeDefined();
    expect(screen.getByText('a@x.com')).toBeDefined();
  });

  it('renders org unit name when user has org_unit_id', () => {
    const columns = getEmployeeColumns(defaultProps);
    render(<TestTable columns={columns} data={[mockEmployee]} />);
    expect(screen.getByText('Engineering')).toBeDefined();
  });

  it('renders "Unassigned" when no org unit matches', () => {
    const columns = getEmployeeColumns({ ...defaultProps, orgUnits: [] });
    render(<TestTable columns={columns} data={[mockEmployee]} />);
    expect(screen.getByText('Unassigned')).toBeDefined();
  });

  it('does not render actions column for non-admins', () => {
    const columns = getEmployeeColumns({ ...defaultProps, isAdmin: false });
    render(<TestTable columns={columns} data={[mockEmployee]} />);
    expect(screen.queryByRole('button', { name: '' })).toBeNull();
  });

  it('renders actions dropdown for admins', () => {
    const columns = getEmployeeColumns({ ...defaultProps, isAdmin: true });
    render(<TestTable columns={columns} data={[mockEmployee]} />);
    const moreButton = screen.getByRole('button');
    expect(moreButton).toBeDefined();
  });
});
