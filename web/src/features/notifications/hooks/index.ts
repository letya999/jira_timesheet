import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  getMyNotificationsApiV1NotificationsGet,
  getNotificationStatsApiV1NotificationsStatsGet,
  updateNotificationApiV1NotificationsNotificationIdPatch,
  markAllNotificationsReadApiV1NotificationsMarkAllReadPost,
} from '../../../api/generated/sdk.gen';
import type { NotificationResponse, NotificationStats } from '../../../api/generated/types.gen';
import { toast } from '../../../lib/toast';

export const notificationsKeys = {
  all: () => ['notifications'] as const,
  list: (params?: object) => ['notifications', 'list', params] as const,
  stats: () => ['notifications', 'stats'] as const,
};

type Notification = NotificationResponse;

type NotificationsResponse = {
  items?: NotificationResponse[];
};

function normalizeNotifications(data: Notification[] | NotificationsResponse | null | undefined): Notification[] {
  if (!data) return [];
  if (Array.isArray(data)) return data;
  if (Array.isArray(data.items)) return data.items;
  return [];
}

type OptimisticNotification = {
  id: number;
  is_read: boolean;
};

export function useNotifications(params?: { page?: number; size?: number }) {
  return useQuery({
    queryKey: notificationsKeys.list(params),
    queryFn: async () => {
      const res = await getMyNotificationsApiV1NotificationsGet({
        throwOnError: true,
        query: params,
      });
      return normalizeNotifications(res.data);
    },
    // Poll every 30s per spec requirement
    refetchInterval: 30_000,
    // No stale time — notifications should be fresh
    staleTime: 0,
  });
}

export function useNotificationStats() {
  return useQuery({
    queryKey: notificationsKeys.stats(),
    queryFn: async (): Promise<NotificationStats> => {
      const res = await getNotificationStatsApiV1NotificationsStatsGet({ throwOnError: true });
      return res.data;
    },
    refetchInterval: 30_000,
    staleTime: 0,
  });
}

export function useMarkAsRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (notificationId: number) => {
      const res = await updateNotificationApiV1NotificationsNotificationIdPatch({
        throwOnError: true,
        path: { notification_id: notificationId },
        body: { is_read: true },
      });
      return res.data;
    },
    onMutate: async (notificationId) => {
      await queryClient.cancelQueries({ queryKey: notificationsKeys.all() });

      const previousData = queryClient.getQueriesData<OptimisticNotification[]>({
        queryKey: notificationsKeys.all(),
      });

      queryClient.setQueriesData<OptimisticNotification[]>(
        { queryKey: notificationsKeys.all() },
        (old) => {
          if (!Array.isArray(old)) return old;
          return old.map((n) => (n.id === notificationId ? { ...n, is_read: true } : n));
        },
      );

      return { previousData };
    },
    onError: (_err, _id, ctx) => {
      if (ctx?.previousData) {
        for (const [key, data] of ctx.previousData) {
          queryClient.setQueryData(key, data);
        }
      }
      toast.error('Failed to mark notification as read.');
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: notificationsKeys.all() });
      queryClient.invalidateQueries({ queryKey: notificationsKeys.stats() });
    },
  });
}

export function useMarkAllRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      await markAllNotificationsReadApiV1NotificationsMarkAllReadPost({ throwOnError: true });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: notificationsKeys.all() });
      queryClient.invalidateQueries({ queryKey: notificationsKeys.stats() });
    },
  });
}
