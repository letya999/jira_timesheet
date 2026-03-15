import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  getMyNotificationsApiV1NotificationsGet,
  updateNotificationApiV1NotificationsNotificationIdPatch,
  markAllNotificationsReadApiV1NotificationsMarkAllReadPost,
} from '../../../api/generated/sdk.gen';
import { toast } from '../../../lib/toast';

export const notificationsKeys = {
  all: () => ['notifications'] as const,
  list: (params?: object) => ['notifications', 'list', params] as const,
};

type Notification = {
  id: number;
  is_read: boolean;
  [key: string]: unknown;
};

export function useNotifications(params?: { unread_only?: boolean; limit?: number }) {
  return useQuery({
    queryKey: notificationsKeys.list(params),
    queryFn: async () => {
      const res = await getMyNotificationsApiV1NotificationsGet({
        throwOnError: true,
        query: params,
      });
      return res.data;
    },
    // Poll every 30s per spec requirement
    refetchInterval: 30_000,
    // No stale time — notifications should be fresh
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

      const previousData = queryClient.getQueriesData<Notification[]>({
        queryKey: notificationsKeys.all(),
      });

      queryClient.setQueriesData<Notification[]>(
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
    },
  });
}
