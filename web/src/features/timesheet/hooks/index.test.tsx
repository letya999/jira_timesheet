import { describe, it, expect, vi, beforeEach } from 'vitest';
import { waitFor, act } from '@testing-library/react';
import { renderHookWithQuery, createTestQueryClient } from '../../../test/render-with-providers';

vi.mock('../../../api/generated/sdk.gen', () => ({
  getAllWorklogsApiV1TimesheetGet: vi.fn(),
  getMyWorklogsApiV1TimesheetWorklogsGet: vi.fn(),
  createManualLogApiV1TimesheetManualPost: vi.fn(),
}));

import {
  getAllWorklogsApiV1TimesheetGet,
  createManualLogApiV1TimesheetManualPost,
} from '../../../api/generated/sdk.gen';
import {
  useTimesheetEntries,
  useCreateEntry,
  timesheetKeys,
} from './index';

const mockEntries = [
  { id: 1, date: '2026-03-01', hours: 8, type: 'MANUAL', status: 'DRAFT', description: 'Work' },
  { id: 2, date: '2026-03-02', hours: 6, type: 'JIRA', status: 'DRAFT', description: null },
];

beforeEach(() => {
  vi.clearAllMocks();
});

describe('useTimesheetEntries', () => {
  it('returns entries from the API', async () => {
    vi.mocked(getAllWorklogsApiV1TimesheetGet).mockResolvedValue({ data: mockEntries } as never);

    const { result } = renderHookWithQuery(() => useTimesheetEntries());
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(mockEntries);
  });

  it('passes query params to the API', async () => {
    vi.mocked(getAllWorklogsApiV1TimesheetGet).mockResolvedValue({ data: [] } as never);
    const params = { start_date: '2026-03-01', end_date: '2026-03-31' };

    renderHookWithQuery(() => useTimesheetEntries(params));
    await waitFor(() => expect(getAllWorklogsApiV1TimesheetGet).toHaveBeenCalledWith(
      expect.objectContaining({ query: params }),
    ));
  });
});

describe('useCreateEntry — optimistic update', () => {
  it('adds entry to cache optimistically before API resolves', async () => {
    // Pre-seed the cache with existing entries
    const qc = createTestQueryClient();
    qc.setQueryData(timesheetKeys.entries(), mockEntries);

    // Make the mutation hang so we can inspect the optimistic state
    let resolveCreate!: (v: unknown) => void;
    vi.mocked(createManualLogApiV1TimesheetManualPost).mockImplementation(
      () => new Promise((res) => { resolveCreate = res; }),
    );

    const { result } = renderHookWithQuery(() => useCreateEntry(), { queryClient: qc });

    await act(async () => {
      result.current.mutate({
        date: '2026-03-10',
        hours: 4,
        category: 'MANUAL',
        description: 'Optimistic entry',
      });
    });

    // onMutate is async — wait until the optimistic entry appears in cache
    await waitFor(() => {
      const cached = qc.getQueryData<typeof mockEntries>(timesheetKeys.entries());
      expect(cached?.some((e) => e.description === 'Optimistic entry')).toBe(true);
    });

    // Resolve the API call
    act(() => resolveCreate({ data: { id: 99, date: '2026-03-10', hours: 4 } }));
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });

  it('rolls back cache on API failure', async () => {
    const qc = createTestQueryClient();
    qc.setQueryData(timesheetKeys.entries(), mockEntries);

    vi.mocked(createManualLogApiV1TimesheetManualPost).mockRejectedValue(new Error('500'));
    // Re-seed after invalidation (settlement refetch)
    vi.mocked(getAllWorklogsApiV1TimesheetGet).mockResolvedValue({ data: mockEntries } as never);

    const { result } = renderHookWithQuery(() => useCreateEntry(), { queryClient: qc });

    act(() => {
      result.current.mutate({ date: '2026-03-10', hours: 4, category: 'MANUAL' });
    });

    await waitFor(() => expect(result.current.isError).toBe(true));

    // After rollback + re-fetch the optimistic entry should be gone
    const cached = qc.getQueryData<typeof mockEntries>(timesheetKeys.entries());
    const optimisticIds = cached?.filter((e) => e.id < 0) ?? [];
    expect(optimisticIds).toHaveLength(0);
  });
});
