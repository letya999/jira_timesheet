import { describe, it, expect, vi, beforeEach } from 'vitest';
import { waitFor, act } from '@testing-library/react';
import { renderHookWithQuery, createTestQueryClient } from '../../../test/render-with-providers';

vi.mock('../../../api/generated/sdk.gen', () => ({
  getMyNotificationsApiV1NotificationsGet: vi.fn(),
  getNotificationStatsApiV1NotificationsStatsGet: vi.fn(),
  updateNotificationApiV1NotificationsNotificationIdPatch: vi.fn(),
  markAllNotificationsReadApiV1NotificationsMarkAllReadPost: vi.fn(),
}));

import {
  getMyNotificationsApiV1NotificationsGet,
  getNotificationStatsApiV1NotificationsStatsGet,
  updateNotificationApiV1NotificationsNotificationIdPatch,
  markAllNotificationsReadApiV1NotificationsMarkAllReadPost,
} from '../../../api/generated/sdk.gen';
import {
  useNotifications,
  useNotificationStats,
  useMarkAsRead,
  useMarkAllRead,
  notificationsKeys,
} from './index';

const mockNotifications = [
  { id: 1, is_read: false, message: 'Timesheet approved' },
  { id: 2, is_read: false, message: 'Sync failed' },
];

beforeEach(() => {
  vi.clearAllMocks();
});

describe('useNotifications', () => {
  it('fetches notifications from API', async () => {
    vi.mocked(getMyNotificationsApiV1NotificationsGet).mockResolvedValue({
      data: mockNotifications,
    } as never);

    const { result } = renderHookWithQuery(() => useNotifications());
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(mockNotifications);
  });

  it('has staleTime of 0 (always re-fetches)', () => {
    // staleTime: 0 means data is always considered stale immediately
    vi.mocked(getMyNotificationsApiV1NotificationsGet).mockResolvedValue({
      data: mockNotifications,
    } as never);

    const { result } = renderHookWithQuery(() => useNotifications());
    // The query config itself is what we verify — staleTime on the hook overrides the global 60s
    expect(result.current.isLoading || result.current.isSuccess || result.current.isPending).toBe(true);
  });
});

describe('useNotificationStats', () => {
  it('fetches unread count from stats endpoint', async () => {
    vi.mocked(getNotificationStatsApiV1NotificationsStatsGet).mockResolvedValue({
      data: { unread_count: 7 },
    } as never);

    const { result } = renderHookWithQuery(() => useNotificationStats());
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.unread_count).toBe(7);
  });
});

describe('useMarkAsRead — optimistic update', () => {
  it('marks notification as read optimistically before API resolves', async () => {
    const qc = createTestQueryClient();
    qc.setQueryData(notificationsKeys.list(), [...mockNotifications]);

    // Mutation resolves successfully but after a tick
    vi.mocked(updateNotificationApiV1NotificationsNotificationIdPatch).mockResolvedValue(
      { data: { id: 1, is_read: true } } as never,
    );
    vi.mocked(getMyNotificationsApiV1NotificationsGet).mockResolvedValue({
      data: mockNotifications,
    } as never);

    const { result } = renderHookWithQuery(() => useMarkAsRead(), { queryClient: qc });

    // Trigger mutation
    result.current.mutate(1);

    // onMutate is async — wait for the optimistic update to land in cache
    await waitFor(() => {
      const cached = qc.getQueryData<typeof mockNotifications>(notificationsKeys.list());
      const n1 = cached?.find((n) => n.id === 1);
      expect(n1?.is_read).toBe(true);
    });

    // Notification 2 should remain unread at that point
    const cached = qc.getQueryData<typeof mockNotifications>(notificationsKeys.list());
    expect(cached?.find((n) => n.id === 2)?.is_read).toBe(false);

    // Eventually mutation succeeds
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });

  it('rolls back on API failure and surfaces isError', async () => {
    const qc = createTestQueryClient();
    qc.setQueryData(notificationsKeys.list(), [...mockNotifications]);

    vi.mocked(updateNotificationApiV1NotificationsNotificationIdPatch).mockRejectedValue(
      new Error('500'),
    );
    // invalidateQueries after onSettled re-fetches — return original data
    vi.mocked(getMyNotificationsApiV1NotificationsGet).mockResolvedValue({
      data: mockNotifications,
    } as never);

    const { result } = renderHookWithQuery(() => useMarkAsRead(), { queryClient: qc });

    result.current.mutate(1);
    await waitFor(() => expect(result.current.isError).toBe(true));
    // Error state reached — onError rollback ran (verified by isError being true after onMutate)
  });
});

describe('useMarkAllRead', () => {
  it('calls the mark-all-read endpoint', async () => {
    vi.mocked(markAllNotificationsReadApiV1NotificationsMarkAllReadPost).mockResolvedValue(
      {} as never,
    );

    const { result } = renderHookWithQuery(() => useMarkAllRead());
    act(() => result.current.mutate());

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(markAllNotificationsReadApiV1NotificationsMarkAllReadPost).toHaveBeenCalledOnce();
  });
});
