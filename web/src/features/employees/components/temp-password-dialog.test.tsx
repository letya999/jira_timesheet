import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { TempPasswordDialog } from './temp-password-dialog';

describe('TempPasswordDialog', () => {
  const mockCredentials = {
    display_name: 'Alice',
    email: 'alice@example.com',
    temporary_password: 'secret-password'
  };

  const mockOnClose = vi.fn();

  beforeEach(() => {
    mockOnClose.mockClear();
    // Mock navigator.clipboard
    Object.assign(navigator, {
      clipboard: {
        writeText: vi.fn().mockImplementation(() => Promise.resolve()),
      },
    });
  });

  it('renders nothing when credentials is null', () => {
    render(<TempPasswordDialog credentials={null} onClose={mockOnClose} />);
    // Dialog uses Portal, so it might not be in container, but screen should be empty of its content
    expect(screen.queryByText('System User Created')).toBeNull();
  });

  it('renders credentials when provided', () => {
    render(<TempPasswordDialog credentials={mockCredentials} onClose={mockOnClose} />);
    expect(screen.getByText('System User Created')).toBeDefined();
    expect(screen.getByText('Alice')).toBeDefined();
    expect(screen.getByText('alice@example.com')).toBeDefined();
    expect(screen.getByText('secret-password')).toBeDefined();
  });

  it('calls onClose when Close button is clicked', () => {
    render(<TempPasswordDialog credentials={mockCredentials} onClose={mockOnClose} />);
    // Dialog renders two "Close" buttons: the built-in X icon and the footer button
    const closeButtons = screen.getAllByRole('button', { name: /close/i });
    expect(closeButtons.length).toBeGreaterThan(0);
    const button = closeButtons[closeButtons.length - 1];
    if (button) fireEvent.click(button);
    expect(mockOnClose).toHaveBeenCalled();
  });

  it('copies email to clipboard when copy button clicked', () => {
    render(<TempPasswordDialog credentials={mockCredentials} onClose={mockOnClose} />);
    // There are two copy buttons, first is for email
    const copyButtons = screen.getAllByRole('button');
    // Button 0 and 1 are copy buttons, Button 2 is Close
    const firstButton = copyButtons[0];
    if (firstButton) fireEvent.click(firstButton);
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith('alice@example.com');
  });

  it('copies password to clipboard when copy button clicked', () => {
    render(<TempPasswordDialog credentials={mockCredentials} onClose={mockOnClose} />);
    const copyButtons = screen.getAllByRole('button');
    const secondButton = copyButtons[1];
    if (secondButton) fireEvent.click(secondButton);
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith('secret-password');
  });
});
