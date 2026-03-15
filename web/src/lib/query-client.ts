import { MutationCache, QueryCache, QueryClient } from '@tanstack/react-query';
import { toast } from './toast';

const SKIP_RETRY_STATUSES = new Set([401, 403, 404]);

function getErrorStatus(error: unknown): number | null {
  if (error && typeof error === 'object' && 'status' in error) {
    const s = (error as { status: unknown }).status;
    if (typeof s === 'number') return s;
  }
  return null;
}

function shouldRetry(failureCount: number, error: unknown): boolean {
  if (failureCount >= 3) return false;
  const status = getErrorStatus(error);
  if (status !== null && SKIP_RETRY_STATUSES.has(status)) return false;
  return true;
}

function retryDelay(attemptIndex: number): number {
  return Math.min(1_000 * 2 ** attemptIndex, 30_000);
}

export let queryClient: QueryClient

export function createQueryClient(): QueryClient {
  const client = new QueryClient({
    queryCache: new QueryCache({
      onError(error) {
        const status = getErrorStatus(error);
        if (status !== null && status >= 500) {
          toast.error('Server error. Please try again later.');
        } else if (status === null) {
          toast.error('Network error. Check your connection.');
        }
      },
    }),
    mutationCache: new MutationCache({
      onError(error) {
        const status = getErrorStatus(error);
        if (status !== null && status >= 500) {
          toast.error('Server error. Please try again later.');
        }
      },
    }),
    defaultOptions: {
      queries: {
        staleTime: 60_000,
        gcTime: 5 * 60_000,
        retry: shouldRetry,
        retryDelay,
      },
      mutations: {
        retry: false,
      },
    },
  });
  queryClient = client;
  return client;
}
