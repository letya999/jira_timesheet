import { createClient } from '@hey-api/client-fetch';
import { client as generatedClient } from './generated/client.gen';

// Token storage key - matches what the auth store will use
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

export const client = createClient({
  baseUrl: import.meta.env.VITE_API_URL || 'http://localhost:8000',
});

// Configure the generated client to use the same settings
generatedClient.setConfig({
  baseUrl: import.meta.env.VITE_API_URL || 'http://localhost:8000',
});

// Helper to attach interceptors to any client
const setupInterceptors = (c: ReturnType<typeof createClient>) => {
  // Attach Bearer token to every request
  c.interceptors.request.use((request) => {
    const token = getStoredToken();
    if (token) {
      request.headers.set('Authorization', `Bearer ${token}`);
    }
    return request;
  });

  // Global response error handler
  c.interceptors.response.use((response) => {
    if (response.status === 401) {
      clearStoredToken();
      if (!window.location.pathname.startsWith('/login')) {
        window.location.href = '/login';
      }
    } else if (response.status === 403) {
      console.error('[API] Forbidden:', response.url);
    } else if (response.status >= 500) {
      console.error('[API] Server error:', response.status, response.url);
    }
    return response;
  });
};

setupInterceptors(client);
setupInterceptors(generatedClient as any);
