import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { Guard } from './guard';
import { useAuthStore } from '@/stores/auth-store';

beforeEach(() => {
  act(() => {
    useAuthStore.setState({ permissions: [], isAuthenticated: false, user: null, token: null });
  });
});

describe('Guard', () => {
  it('renders children when user has the required permission', () => {
    act(() => {
      useAuthStore.setState({ permissions: ['reports.view'] });
    });

    render(
      <Guard permission="reports.view">
        <span>Secret content</span>
      </Guard>,
    );

    expect(screen.getByText('Secret content')).toBeInTheDocument();
  });

  it('renders nothing when user lacks the required permission', () => {
    render(
      <Guard permission="hr:read">
        <span>HR content</span>
      </Guard>,
    );

    expect(screen.queryByText('HR content')).not.toBeInTheDocument();
  });

  it('renders fallback when user lacks permission and fallback is provided', () => {
    render(
      <Guard permission="settings.manage" fallback={<span>Access denied</span>}>
        <span>Admin panel</span>
      </Guard>,
    );

    expect(screen.queryByText('Admin panel')).not.toBeInTheDocument();
    expect(screen.getByText('Access denied')).toBeInTheDocument();
  });

  it('updates when permissions change', () => {
    const { rerender } = render(
      <Guard permission="sync.manage">
        <span>Sync tool</span>
      </Guard>,
    );

    expect(screen.queryByText('Sync tool')).not.toBeInTheDocument();

    act(() => {
      useAuthStore.setState({ permissions: ['sync.manage'] });
    });

    rerender(
      <Guard permission="sync.manage">
        <span>Sync tool</span>
      </Guard>,
    );

    expect(screen.getByText('Sync tool')).toBeInTheDocument();
  });
});
