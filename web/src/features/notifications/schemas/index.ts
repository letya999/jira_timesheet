import { z } from 'zod';

export const notificationResponseSchema = z.object({
  id: z.number(),
  user_id: z.number(),
  sender_id: z.number().nullable(),
  title: z.string(),
  message: z.string(),
  type: z.string(),
  is_read: z.boolean(),
  related_entity_id: z.number().nullable(),
  related_entity_type: z.string().nullable(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
  sender_name: z.string().nullable(),
});

export const notificationStatsSchema = z.object({
  unread_count: z.number(),
});

export type NotificationResponse = z.infer<typeof notificationResponseSchema>;
export type NotificationStats = z.infer<typeof notificationStatsSchema>;
