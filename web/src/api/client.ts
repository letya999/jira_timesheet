import { createClient } from '@hey-api/client-fetch';
import { client as generatedClient } from './generated/client.gen';

const BASE_URL = import.meta.env.VITE_API_URL || '';
const TOKEN_KEY = 'auth_token';

export function getStoredToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setStoredToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearStoredToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}

function redirectToLogin() {
  clearStoredToken();
  // Lazy-import to avoid circular dep with auth store
  import('../stores/auth-store').then(({ useAuthStore }) => {
    useAuthStore.getState().clearAuth();
  });
  if (!window.location.pathname.startsWith('/login')) {
    window.location.href = '/login';
  }
}

// Prevents concurrent refresh storms — only one refresh in flight at a time.
let isRefreshing = false;
let pendingResolvers: Array<(token: string | null) => void> = [];

async function attemptTokenRefresh(): Promise<string | null> {
  if (isRefreshing) {
    return new Promise((resolve) => {
      pendingResolvers.push(resolve);
    });
  }

  isRefreshing = true;
  try {
    const res = await fetch(`${BASE_URL}/api/v1/auth/refresh`, {
      method: 'POST',
      credentials: 'include', // sends httpOnly refresh cookie
    });

    if (!res.ok) {
      pendingResolvers.forEach((r) => r(null));
      pendingResolvers = [];
      return null;
    }

    const body = (await res.json()) as { access_token?: string };
    const newToken = body.access_token ?? null;

    if (newToken) {
      setStoredToken(newToken);
      import('../stores/auth-store').then(({ useAuthStore }) => {
        useAuthStore.getState().setToken(newToken);
      });
    }

    pendingResolvers.forEach((r) => r(newToken));
    pendingResolvers = [];
    return newToken;
  } catch {
    pendingResolvers.forEach((r) => r(null));
    pendingResolvers = [];
    return null;
  } finally {
    isRefreshing = false;
  }
}

const setupInterceptors = (c: ReturnType<typeof createClient>) => {
  c.interceptors.request.use((request) => {
    const token = getStoredToken();
    if (token) {
      request.headers.set('Authorization', `Bearer ${token}`);
    }
    return request;
  });

  c.interceptors.response.use(async (response, request) => {
    if (response.status === 401) {
      // Don't attempt refresh if this request IS the refresh call (loop guard)
      const url = typeof request === 'string' ? request : request?.url ?? '';
      if (url.includes('/auth/refresh') || url.includes('/auth/login')) {
        redirectToLogin();
        return response;
      }

      const newToken = await attemptTokenRefresh();
      if (!newToken) {
        redirectToLogin();
        return response;
      }

      // Retry the original request with the fresh token
      const retried = new Request(request as RequestInfo, {
        headers: new Headers(request instanceof Request ? request.headers : {}),
      });
      retried.headers.set('Authorization', `Bearer ${newToken}`);
      return fetch(retried);
    }

    if (response.status === 403) {
      console.error('[API] Forbidden:', response.url);
    } else if (response.status >= 500) {
      console.error('[API] Server error:', response.status, response.url);
    }

    return response;
  });
};

export const client = createClient({ baseUrl: BASE_URL });

generatedClient.setConfig({ baseUrl: BASE_URL });

setupInterceptors(client);
setupInterceptors(generatedClient as ReturnType<typeof createClient>);
