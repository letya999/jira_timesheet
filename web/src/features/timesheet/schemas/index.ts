import { z } from 'zod';

export const worklogResponseSchema = z.object({
  id: z.number(),
  date: z.string().date(),
  hours: z.number().positive(),
  type: z.enum(['JIRA', 'MANUAL']),
  category_id: z.number().nullable(),
  description: z.string().nullable(),
  status: z.string(),
  source_created_at: z.string().datetime().nullable(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
  user_name: z.string().nullable(),
  jira_account_id: z.string().nullable(),
  issue_key: z.string().nullable(),
  issue_summary: z.string().nullable(),
  project_name: z.string().nullable(),
  category: z.string().nullable(),
  category_name: z.string().nullable(),
  team_name: z.string().nullable(),
});

export const manualLogCreateSchema = z.object({
  date: z.string().date(),
  hours: z.number().positive().max(24),
  category: z.string().min(1, 'Category is required'),
  description: z.string().optional(),
  user_id: z.number().optional(),
  issue_id: z.number().optional(),
});

export const timesheetPeriodResponseSchema = z.object({
  id: z.number(),
  user_id: z.number(),
  start_date: z.string().date(),
  end_date: z.string().date(),
  status: z.string(),
  submitted_at: z.string().datetime().nullable(),
  approved_at: z.string().datetime().nullable(),
  approved_by_id: z.number().nullable(),
  comment: z.string().nullable(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
  total_hours: z.number().nullable(),
});

export type WorklogResponse = z.infer<typeof worklogResponseSchema>;
export type ManualLogCreate = z.infer<typeof manualLogCreateSchema>;
export type TimesheetPeriodResponse = z.infer<typeof timesheetPeriodResponseSchema>;
