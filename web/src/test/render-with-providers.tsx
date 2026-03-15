import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, type RenderHookOptions } from '@testing-library/react';

export function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      // gcTime: Infinity prevents inactive queries from being GC'd mid-test
      queries: { retry: false, gcTime: Infinity, staleTime: 0 },
      mutations: { retry: false },
    },
  });
}

export function makeWrapper(queryClient?: QueryClient) {
  const client = queryClient ?? createTestQueryClient();
  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  return Wrapper;
}

export function renderHookWithQuery<T>(
  hook: () => T,
  options?: Omit<RenderHookOptions<unknown>, 'wrapper'> & { queryClient?: QueryClient },
) {
  const qc = options?.queryClient ?? createTestQueryClient();
  return {
    ...renderHook(hook, { wrapper: makeWrapper(qc), ...options }),
    queryClient: qc,
  };
}
