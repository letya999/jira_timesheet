import { z } from 'zod';

export const syncStatusSchema = z.object({
  status: z.enum(['idle', 'running', 'error']),
  last_sync_at: z.string().datetime().nullable(),
  message: z.string().nullable(),
});

export type SyncStatus = z.infer<typeof syncStatusSchema>;
