import { describe, it, expect, vi, beforeEach } from 'vitest';
import { waitFor, act } from '@testing-library/react';
import { renderHookWithQuery } from '../../../test/render-with-providers';
import { useAuthStore } from '../../../stores/auth-store';

// Mock the generated SDK functions
vi.mock('../../../api/generated/sdk.gen', () => ({
  readUsersMeApiV1UsersMeGet: vi.fn(),
  loginApiV1AuthLoginPost: vi.fn(),
}));

// Mock the API client helpers
vi.mock('../../../api/client', () => ({
  getStoredToken: vi.fn(() => null),
  setStoredToken: vi.fn(),
  clearStoredToken: vi.fn(),
}));

import { readUsersMeApiV1UsersMeGet, loginApiV1AuthLoginPost } from '../../../api/generated/sdk.gen';
import { useCurrentUser, useLogin, useLogout } from './index';

const mockProfile = {
  id: 1,
  username: 'alice',
  email: 'alice@example.com',
  display_name: 'Alice',
  is_active: true,
  is_admin: false,
  jira_account_id: null,
};

beforeEach(() => {
  vi.clearAllMocks();
  act(() => {
    useAuthStore.setState({
      user: null,
      token: null,
      permissions: [],
      isAuthenticated: false,
    });
  });
});

describe('useCurrentUser', () => {
  it('does not fetch when not authenticated', () => {
    renderHookWithQuery(() => useCurrentUser());
    expect(readUsersMeApiV1UsersMeGet).not.toHaveBeenCalled();
  });

  it('fetches user profile when authenticated', async () => {
    vi.mocked(readUsersMeApiV1UsersMeGet).mockResolvedValue({ data: mockProfile } as never);

    act(() => {
      useAuthStore.getState().setAuth(mockProfile, 'test-token');
    });

    const { result } = renderHookWithQuery(() => useCurrentUser());
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(mockProfile);
  });
});

describe('useLogin', () => {
  it('calls login endpoint and sets auth on success', async () => {
    vi.mocked(loginApiV1AuthLoginPost).mockResolvedValue({
      data: { access_token: 'jwt-token', token_type: 'bearer' },
    } as never);
    vi.mocked(readUsersMeApiV1UsersMeGet).mockResolvedValue({ data: mockProfile } as never);

    const { result } = renderHookWithQuery(() => useLogin());
    act(() => {
      result.current.mutate({ username: 'alice', password: 'secret' });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(useAuthStore.getState().isAuthenticated).toBe(true);
    expect(useAuthStore.getState().token).toBe('jwt-token');
  });

  it('exposes error on failed login', async () => {
    vi.mocked(loginApiV1AuthLoginPost).mockRejectedValue({ status: 401 });

    const { result } = renderHookWithQuery(() => useLogin());
    act(() => {
      result.current.mutate({ username: 'bad', password: 'wrong' });
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(useAuthStore.getState().isAuthenticated).toBe(false);
  });
});

describe('useLogout', () => {
  it('clears auth store and query cache', async () => {
    act(() => {
      useAuthStore.getState().setAuth(mockProfile, 'jwt-token');
    });

    const { result } = renderHookWithQuery(() => useLogout());
    act(() => {
      result.current.mutate();
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(useAuthStore.getState().isAuthenticated).toBe(false);
    expect(useAuthStore.getState().token).toBeNull();
  });
});
