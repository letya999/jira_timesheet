import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { UnitForm } from './unit-form';

describe('UnitForm', () => {
  const mockUnits = [
    { id: 1, name: 'Engineering', parent_id: null, reporting_period: 'weekly' }
  ] as any;

  const mockOnSubmit = vi.fn();

  it('renders create mode correctly', () => {
    render(<UnitForm units={mockUnits} onSubmit={mockOnSubmit} isPending={false} />);
    expect(screen.getByText('Add New Unit')).toBeDefined();
    expect(screen.getByPlaceholderText('e.g. Engineering, Sales')).toBeDefined();
    expect(screen.getByText('Create Unit')).toBeDefined();
  });

  it('renders edit mode correctly', () => {
    const initialData = { id: 1, name: 'Engineering', parent_id: null, reporting_period: 'weekly' } as any;
    render(<UnitForm initialData={initialData} units={mockUnits} onSubmit={mockOnSubmit} isPending={false} />);
    expect(screen.getByText('Edit / Delete Unit')).toBeDefined();
    const input = screen.getByDisplayValue('Engineering');
    expect(input).toBeDefined();
    expect(screen.getByText('Update Unit')).toBeDefined();
  });

  it('calls onSubmit with form data', async () => {
    render(<UnitForm units={mockUnits} onSubmit={mockOnSubmit} isPending={false} />);

    const input = screen.getByPlaceholderText('e.g. Engineering, Sales');
    fireEvent.change(input, { target: { value: 'Sales' } });

    const submitButton = screen.getByText('Create Unit');
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalledWith(expect.objectContaining({
        name: 'Sales',
        reporting_period: 'weekly'
      }));
    });
  });

  it('disables submit button when isPending is true', () => {
    render(<UnitForm units={mockUnits} onSubmit={mockOnSubmit} isPending={true} />);
    const submitButton = screen.getByText('Saving...');
    expect(submitButton.hasAttribute('disabled')).toBe(true);
  });

  it('calls onCancel when cancel button clicked', () => {
    const onCancel = vi.fn();
    render(<UnitForm units={mockUnits} onSubmit={mockOnSubmit} isPending={false} onCancel={onCancel} />);
    const cancelButton = screen.getByText('Cancel');
    fireEvent.click(cancelButton);
    expect(onCancel).toHaveBeenCalled();
  });
});
