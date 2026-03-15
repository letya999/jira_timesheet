import { useCallback, useEffect, useRef } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  loginApiV1AuthLoginPost,
  readUsersMeApiV1UsersMeGet,
} from '../../../api/generated/sdk.gen';
import { clearStoredToken, setStoredToken } from '../../../api/client';
import { useAuthStore } from '../../../stores/auth-store';
import type { UserProfile } from '../../../stores/auth-store';
import { buildPermissionsFromRoles } from '../../../lib/permissions';

export const authKeys = {
  me: () => ['auth', 'me'] as const,
};

// ---------------------------------------------------------------------------
// useCurrentUser
// ---------------------------------------------------------------------------

export function useCurrentUser() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  return useQuery({
    queryKey: authKeys.me(),
    queryFn: async () => {
      const res = await readUsersMeApiV1UsersMeGet({ throwOnError: true });
      return res.data;
    },
    enabled: isAuthenticated,
    staleTime: 60_000,
  });
}

// ---------------------------------------------------------------------------
// useLogin
// ---------------------------------------------------------------------------

export function useLogin() {
  const queryClient = useQueryClient();
  const setAuth = useAuthStore((s) => s.setAuth);

  return useMutation({
    mutationFn: async (credentials: { username: string; password: string }) => {
      const res = await loginApiV1AuthLoginPost({
        throwOnError: true,
        body: {
          username: credentials.username,
          password: credentials.password,
          grant_type: 'password',
        },
      });
      return res.data;
    },
    onSuccess: async (data) => {
      const token = (data as { access_token?: string })?.access_token;
      if (!token) return;
      setStoredToken(token);
      const me = await readUsersMeApiV1UsersMeGet({ throwOnError: true });
      const user = me.data as UserProfile & { role?: string };
      const permissions = buildPermissionsFromRoles(user?.role ? [user.role] : []);
      setAuth(user, token, permissions);
      queryClient.setQueryData(authKeys.me(), me.data);
    },
  });
}

// ---------------------------------------------------------------------------
// useLogout
// ---------------------------------------------------------------------------

export function useLogout() {
  const queryClient = useQueryClient();
  const clearAuth = useAuthStore((s) => s.clearAuth);

  return useMutation({
    mutationFn: async () => {
      clearStoredToken();
      clearAuth();
    },
    onSuccess: () => {
      queryClient.clear();
    },
  });
}

// ---------------------------------------------------------------------------
// useSsoLogin — redirects browser to backend SSO entry point
// ---------------------------------------------------------------------------

export function useSsoLogin() {
  return useCallback(() => {
    window.location.href = '/api/v1/auth/sso/login';
  }, []);
}

// ---------------------------------------------------------------------------
// usePermissions — RBAC check derived from auth store
// ---------------------------------------------------------------------------

export function usePermissions() {
  const permissions = useAuthStore((s) => s.permissions);
  const can = useCallback(
    (permission: string) => permissions.includes(permission),
    [permissions],
  );
  return { can };
}

// ---------------------------------------------------------------------------
// useInactivityTimer
// ---------------------------------------------------------------------------

interface InactivityTimerOptions {
  timeoutMs: number;
  warnMs: number;
  onWarn: () => void;
  onTimeout: () => void;
}

export function useInactivityTimer({
  timeoutMs,
  warnMs,
  onWarn,
  onTimeout,
}: InactivityTimerOptions) {
  const warnTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const logoutTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const warnFiredRef = useRef(false);

  const reset = useCallback(() => {
    if (warnTimerRef.current) clearTimeout(warnTimerRef.current);
    if (logoutTimerRef.current) clearTimeout(logoutTimerRef.current);
    warnFiredRef.current = false;

    warnTimerRef.current = setTimeout(() => {
      warnFiredRef.current = true;
      onWarn();
    }, warnMs);

    logoutTimerRef.current = setTimeout(() => {
      onTimeout();
    }, timeoutMs);
  }, [timeoutMs, warnMs, onWarn, onTimeout]);

  useEffect(() => {
    const events = ['mousemove', 'keydown', 'touchstart', 'click'] as const;
    const handler = () => reset();

    reset();
    events.forEach((e) => window.addEventListener(e, handler, { passive: true }));

    return () => {
      events.forEach((e) => window.removeEventListener(e, handler));
      if (warnTimerRef.current) clearTimeout(warnTimerRef.current);
      if (logoutTimerRef.current) clearTimeout(logoutTimerRef.current);
    };
  }, [reset]);
}

// ---------------------------------------------------------------------------
// useRefreshToken (placeholder — backend exposes no refresh endpoint yet)
// ---------------------------------------------------------------------------

export function useRefreshToken() {
  const setToken = useAuthStore((s) => s.setToken);

  return useMutation({
    mutationFn: async () => {
      throw new Error('Refresh token endpoint not implemented');
    },
    onSuccess: (token: string) => {
      setStoredToken(token);
      setToken(token);
    },
  });
}
