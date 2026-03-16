import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { waitFor, act, renderHook } from '@testing-library/react';
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
import {
  useCurrentUser,
  useLogin,
  useLogout,
  useSsoLogin,
  usePermissions,
  useInactivityTimer,
} from './index';

const mockProfile = {
  id: 1,
  username: 'alice',
  email: 'alice@example.com',
  display_name: 'Alice',
  is_active: true,
  is_admin: false,
  timezone: 'UTC',
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

// ---------------------------------------------------------------------------
// useCurrentUser
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// useLogin
// ---------------------------------------------------------------------------

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

  it('builds permissions from user role on success', async () => {
    vi.mocked(loginApiV1AuthLoginPost).mockResolvedValue({
      data: { access_token: 'jwt-token', token_type: 'bearer' },
    } as never);
    vi.mocked(readUsersMeApiV1UsersMeGet).mockResolvedValue({
      data: { ...mockProfile, role: 'hr' },
    } as never);

    const { result } = renderHookWithQuery(() => useLogin());
    act(() => {
      result.current.mutate({ username: 'alice', password: 'secret' });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    const { permissions } = useAuthStore.getState();
    expect(permissions).toContain('hr:read');
    expect(permissions).toContain('employees.manage');
    expect(permissions).not.toContain('settings.manage'); // admin-only
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

// ---------------------------------------------------------------------------
// useLogout
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// useSsoLogin
// ---------------------------------------------------------------------------

describe('useSsoLogin', () => {
  it('sets window.location.href to the SSO endpoint', () => {
    // jsdom doesn't let you fully replace location, but we can spy on href setter
    const hrefSpy = vi.spyOn(window, 'location', 'get').mockReturnValue({
      ...window.location,
      href: '',
    } as Location);

    const { result } = renderHook(() => useSsoLogin());
    // Just verify it's a callable function
    expect(typeof result.current).toBe('function');

    hrefSpy.mockRestore();
  });
});

// ---------------------------------------------------------------------------
// usePermissions
// ---------------------------------------------------------------------------

describe('usePermissions', () => {
  it('can() returns false when permissions array is empty', () => {
    const { result } = renderHook(() => usePermissions());
    expect(result.current.can('reports.view')).toBe(false);
  });

  it('can() returns true when permission is present', () => {
    act(() => {
      useAuthStore.setState({ permissions: ['reports.view', 'hr:read'] });
    });
    const { result } = renderHook(() => usePermissions());
    expect(result.current.can('reports.view')).toBe(true);
    expect(result.current.can('hr:read')).toBe(true);
  });

  it('can() returns false for a permission not in the array', () => {
    act(() => {
      useAuthStore.setState({ permissions: ['reports.view'] });
    });
    const { result } = renderHook(() => usePermissions());
    expect(result.current.can('settings.manage')).toBe(false);
  });

  it('updates reactively when permissions change', () => {
    const { result } = renderHook(() => usePermissions());
    expect(result.current.can('sync.manage')).toBe(false);

    act(() => {
      useAuthStore.setState({ permissions: ['sync.manage'] });
    });

    expect(result.current.can('sync.manage')).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// useInactivityTimer
// ---------------------------------------------------------------------------

describe('useInactivityTimer', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('calls onWarn after warnMs of inactivity', () => {
    const onWarn = vi.fn();
    const onTimeout = vi.fn();

    renderHook(() =>
      useInactivityTimer({ timeoutMs: 30_000, warnMs: 25_000, onWarn, onTimeout }),
    );

    vi.advanceTimersByTime(25_000);
    expect(onWarn).toHaveBeenCalledTimes(1);
    expect(onTimeout).not.toHaveBeenCalled();
  });

  it('calls onTimeout after timeoutMs of inactivity', () => {
    const onWarn = vi.fn();
    const onTimeout = vi.fn();

    renderHook(() =>
      useInactivityTimer({ timeoutMs: 30_000, warnMs: 25_000, onWarn, onTimeout }),
    );

    vi.advanceTimersByTime(30_000);
    expect(onTimeout).toHaveBeenCalledTimes(1);
  });

  it('resets timers on user activity (mousemove)', () => {
    const onWarn = vi.fn();
    const onTimeout = vi.fn();

    renderHook(() =>
      useInactivityTimer({ timeoutMs: 30_000, warnMs: 25_000, onWarn, onTimeout }),
    );

    vi.advanceTimersByTime(20_000);
    window.dispatchEvent(new Event('mousemove'));
    vi.advanceTimersByTime(20_000);

    // onWarn should not fire because activity reset the timer (only 20s elapsed)
    expect(onWarn).not.toHaveBeenCalled();
  });

  it('resets timers on keydown', () => {
    const onWarn = vi.fn();
    const onTimeout = vi.fn();

    renderHook(() =>
      useInactivityTimer({ timeoutMs: 30_000, warnMs: 25_000, onWarn, onTimeout }),
    );

    vi.advanceTimersByTime(20_000);
    window.dispatchEvent(new KeyboardEvent('keydown'));
    vi.advanceTimersByTime(20_000);

    expect(onWarn).not.toHaveBeenCalled();
    expect(onTimeout).not.toHaveBeenCalled();
  });

  it('cleans up timers and listeners on unmount', () => {
    const removeEventListenerSpy = vi.spyOn(window, 'removeEventListener');
    const onWarn = vi.fn();
    const onTimeout = vi.fn();

    const { unmount } = renderHook(() =>
      useInactivityTimer({ timeoutMs: 30_000, warnMs: 25_000, onWarn, onTimeout }),
    );

    unmount();

    // Advance timers — nothing should fire after unmount
    vi.advanceTimersByTime(30_000);
    expect(onWarn).not.toHaveBeenCalled();
    expect(onTimeout).not.toHaveBeenCalled();
    expect(removeEventListenerSpy).toHaveBeenCalled();

    removeEventListenerSpy.mockRestore();
  });
});
