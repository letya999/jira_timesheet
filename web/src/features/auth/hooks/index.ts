import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  loginApiV1AuthLoginPost,
  readUsersMeApiV1UsersMeGet,
} from '../../../api/generated/sdk.gen';
import { clearStoredToken, setStoredToken } from '../../../api/client';
import { useAuthStore } from '../../../stores/auth-store';
import type { UserProfile } from '../../../stores/auth-store';

export const authKeys = {
  me: () => ['auth', 'me'] as const,
};

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
      const token = data?.access_token;
      if (!token) return;
      setStoredToken(token);
      // Fetch user profile to populate auth store
      const me = await readUsersMeApiV1UsersMeGet({ throwOnError: true });
      setAuth(me.data as UserProfile, token);
      queryClient.setQueryData(authKeys.me(), me.data);
    },
  });
}

export function useLogout() {
  const queryClient = useQueryClient();
  const clearAuth = useAuthStore((s) => s.clearAuth);

  return useMutation({
    mutationFn: async () => {
      // No backend logout endpoint — token is stateless JWT
      clearStoredToken();
      clearAuth();
    },
    onSuccess: () => {
      queryClient.clear();
    },
  });
}

// Placeholder — wire to a refresh endpoint if the backend exposes one
export function useRefreshToken() {
  const setToken = useAuthStore((s) => s.setToken);

  return useMutation({
    mutationFn: async () => {
      // TODO: call refresh endpoint when available
      throw new Error('Refresh token endpoint not implemented');
    },
    onSuccess: (token: string) => {
      setStoredToken(token);
      setToken(token);
    },
  });
}
