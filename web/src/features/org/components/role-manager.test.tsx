import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { RoleManager } from './role-manager';
import * as orgHooks from '../hooks';

// Mock hooks
vi.mock('../hooks', () => ({
  useRoles: vi.fn(() => ({ data: [], isLoading: false })),
  useCreateRole: vi.fn(() => ({ mutate: vi.fn(), isPending: false })),
  useDeleteRole: vi.fn(() => ({ mutate: vi.fn(), isPending: false })),
}));

describe('RoleManager', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders "Manage Roles" heading', () => {
    render(<RoleManager />);
    expect(screen.getByText('Manage Roles')).toBeDefined();
  });

  it('renders existing roles', () => {
    vi.mocked(orgHooks.useRoles).mockReturnValue({
      data: [
        { id: 1, name: 'Manager', is_system: false },
        { id: 2, name: 'Admin', is_system: true }
      ],
      isLoading: false
    } as any);
    
    render(<RoleManager />);
    expect(screen.getByText('Manager')).toBeDefined();
    expect(screen.getByText('Admin')).toBeDefined();
    expect(screen.getByText('System')).toBeDefined();
  });

  it('calls createRole mutation when Add Role button clicked', () => {
    const mutate = vi.fn();
    vi.mocked(orgHooks.useCreateRole).mockReturnValue({ mutate, isPending: false } as any);
    
    render(<RoleManager />);
    const input = screen.getByPlaceholderText('New role name...') as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'New Role' } });
    
    const addButton = screen.getByText('Add Role');
    fireEvent.click(addButton);
    
    expect(mutate).toHaveBeenCalledWith({ name: 'New Role' }, expect.any(Object));
  });

  it('calls deleteRole mutation when delete button clicked', () => {
    const mutate = vi.fn();
    vi.mocked(orgHooks.useRoles).mockReturnValue({
      data: [{ id: 1, name: 'Manager', is_system: false }],
      isLoading: false
    } as any);
    vi.mocked(orgHooks.useDeleteRole).mockReturnValue({ mutate, isPending: false } as any);
    
    render(<RoleManager />);
    const deleteButton = screen.getByRole('button', { name: '' }); // Trash2 icon button
    fireEvent.click(deleteButton);
    
    expect(mutate).toHaveBeenCalledWith(1, expect.any(Object));
  });

  it('disables delete button for system roles', () => {
    vi.mocked(orgHooks.useRoles).mockReturnValue({
      data: [{ id: 2, name: 'Admin', is_system: true }],
      isLoading: false
    } as any);
    
    render(<RoleManager />);
    const deleteButton = screen.getByRole('button', { name: '' });
    expect(deleteButton.hasAttribute('disabled')).toBe(true);
  });
});
