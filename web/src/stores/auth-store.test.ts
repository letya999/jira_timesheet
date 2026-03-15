import { describe, it, expect, beforeEach } from 'vitest';
import { act } from '@testing-library/react';
import { useAuthStore } from './auth-store';
import type { UserProfile } from './auth-store';

const mockUser: UserProfile = {
  id: 1,
  username: 'john.doe',
  email: 'john@example.com',
  display_name: 'John Doe',
  is_active: true,
  is_admin: false,
  jira_account_id: 'abc123',
};

// Reset the store to initial state before each test
beforeEach(() => {
  act(() => {
    useAuthStore.setState({
      user: null,
      token: null,
      permissions: [],
      isAuthenticated: false,
    });
  });
});

describe('useAuthStore', () => {
  it('starts in unauthenticated state', () => {
    const state = useAuthStore.getState();
    expect(state.isAuthenticated).toBe(false);
    expect(state.user).toBeNull();
    expect(state.token).toBeNull();
    expect(state.permissions).toEqual([]);
  });

  it('setAuth updates all auth fields', () => {
    act(() => {
      useAuthStore.getState().setAuth(mockUser, 'token-abc', ['admin', 'reports']);
    });
    const state = useAuthStore.getState();
    expect(state.isAuthenticated).toBe(true);
    expect(state.user).toEqual(mockUser);
    expect(state.token).toBe('token-abc');
    expect(state.permissions).toEqual(['admin', 'reports']);
  });

  it('setAuth defaults permissions to empty array', () => {
    act(() => {
      useAuthStore.getState().setAuth(mockUser, 'token-xyz');
    });
    expect(useAuthStore.getState().permissions).toEqual([]);
  });

  it('clearAuth resets all fields', () => {
    act(() => {
      useAuthStore.getState().setAuth(mockUser, 'token-abc');
      useAuthStore.getState().clearAuth();
    });
    const state = useAuthStore.getState();
    expect(state.isAuthenticated).toBe(false);
    expect(state.user).toBeNull();
    expect(state.token).toBeNull();
    expect(state.permissions).toEqual([]);
  });

  it('setToken updates only the token', () => {
    act(() => {
      useAuthStore.getState().setAuth(mockUser, 'old-token');
      useAuthStore.getState().setToken('new-token');
    });
    const state = useAuthStore.getState();
    expect(state.token).toBe('new-token');
    expect(state.user).toEqual(mockUser);
    expect(state.isAuthenticated).toBe(true);
  });
});
