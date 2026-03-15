import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface UserProfile {
  id: number;
  username: string;
  email: string;
  display_name: string | null;
  is_active: boolean;
  is_admin: boolean;
  jira_account_id: string | null;
}

interface AuthState {
  user: UserProfile | null;
  token: string | null;
  permissions: string[];
  isAuthenticated: boolean;
  setAuth: (user: UserProfile, token: string, permissions?: string[]) => void;
  clearAuth: () => void;
  setToken: (token: string) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      permissions: [],
      isAuthenticated: false,
      setAuth: (user, token, permissions = []) =>
        set({ user, token, permissions, isAuthenticated: true }),
      clearAuth: () =>
        set({ user: null, token: null, permissions: [], isAuthenticated: false }),
      setToken: (token) => set({ token }),
    }),
    { name: 'auth_store' },
  ),
);
