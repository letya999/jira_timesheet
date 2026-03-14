import { z } from 'zod';

export const reportRequestSchema = z.object({
  start_date: z.string().date(),
  end_date: z.string().date(),
  project_id: z.number().nullable().optional(),
  release_id: z.number().nullable().optional(),
  sprint_id: z.number().nullable().optional(),
  org_unit_id: z.number().nullable().optional(),
  division_id: z.number().nullable().optional(),
  department_id: z.number().nullable().optional(),
  user_ids: z.array(z.number()).nullable().optional(),
  sprint_ids: z.array(z.number()).nullable().optional(),
  worklog_types: z.array(z.enum(['JIRA', 'MANUAL'])).nullable().optional(),
  category_ids: z.array(z.number()).nullable().optional(),
  group_by_rows: z.array(z.string()),
  group_by_cols: z.array(z.string()).default([]),
  date_granularity: z.enum(['day', 'week', '2weeks', 'month', 'quarter']).nullable().default('day'),
  format: z.enum(['hours', 'days']).default('hours'),
  hours_per_day: z.number().positive().default(8),
});

export const reportResponseSchema = z.object({
  data: z.array(z.record(z.unknown())),
  columns: z.array(z.string()),
});

export type ReportRequest = z.infer<typeof reportRequestSchema>;
export type ReportResponse = z.infer<typeof reportResponseSchema>;
