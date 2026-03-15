import { describe, it, expect } from 'vitest';
import { createQueryClient } from './query-client';

describe('createQueryClient', () => {
  it('returns a QueryClient instance', () => {
    const qc = createQueryClient();
    expect(qc).toBeDefined();
    expect(typeof qc.getQueryCache).toBe('function');
  });

  it('applies 60s staleTime by default', () => {
    const qc = createQueryClient();
    expect(qc.getDefaultOptions().queries?.staleTime).toBe(60_000);
  });

  it('applies 5min gcTime by default', () => {
    const qc = createQueryClient();
    expect(qc.getDefaultOptions().queries?.gcTime).toBe(5 * 60_000);
  });

  it('disables mutation retry', () => {
    const qc = createQueryClient();
    expect(qc.getDefaultOptions().mutations?.retry).toBe(false);
  });

  it('skips retry for 401 status', () => {
    const qc = createQueryClient();
    const retryFn = qc.getDefaultOptions().queries?.retry as (
      count: number,
      error: unknown,
    ) => boolean;
    expect(retryFn(0, { status: 401 })).toBe(false);
  });

  it('skips retry for 403 status', () => {
    const qc = createQueryClient();
    const retryFn = qc.getDefaultOptions().queries?.retry as (
      count: number,
      error: unknown,
    ) => boolean;
    expect(retryFn(0, { status: 403 })).toBe(false);
  });

  it('skips retry for 404 status', () => {
    const qc = createQueryClient();
    const retryFn = qc.getDefaultOptions().queries?.retry as (
      count: number,
      error: unknown,
    ) => boolean;
    expect(retryFn(0, { status: 404 })).toBe(false);
  });

  it('retries on 500 up to 3 times', () => {
    const qc = createQueryClient();
    const retryFn = qc.getDefaultOptions().queries?.retry as (
      count: number,
      error: unknown,
    ) => boolean;
    expect(retryFn(0, { status: 500 })).toBe(true);
    expect(retryFn(1, { status: 500 })).toBe(true);
    expect(retryFn(2, { status: 500 })).toBe(true);
    expect(retryFn(3, { status: 500 })).toBe(false);
  });

  it('stops retry after 3 attempts for network errors', () => {
    const qc = createQueryClient();
    const retryFn = qc.getDefaultOptions().queries?.retry as (
      count: number,
      error: unknown,
    ) => boolean;
    expect(retryFn(2, new Error('network'))).toBe(true);
    expect(retryFn(3, new Error('network'))).toBe(false);
  });
});
