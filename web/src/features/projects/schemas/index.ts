import { z } from 'zod';

export const projectResponseSchema = z.object({
  id: z.number(),
  jira_id: z.string(),
  key: z.string(),
  name: z.string(),
  is_active: z.boolean(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});

export const projectUpdateSchema = z.object({
  name: z.string().optional(),
  is_active: z.boolean().optional(),
});

export const sprintResponseSchema = z.object({
  id: z.number(),
  jira_id: z.string(),
  name: z.string(),
  state: z.enum(['active', 'closed', 'future']),
  start_date: z.string().date().nullable(),
  end_date: z.string().date().nullable(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});

export type ProjectResponse = z.infer<typeof projectResponseSchema>;
export type ProjectUpdate = z.infer<typeof projectUpdateSchema>;
export type SprintResponse = z.infer<typeof sprintResponseSchema>;
