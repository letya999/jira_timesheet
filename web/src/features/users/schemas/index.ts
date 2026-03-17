import { z } from 'zod';

export const userResponseSchema = z.object({
  id: z.number(),
  email: z.string().email(),
  full_name: z.string().nullable(),
  role: z.string(),
  is_active: z.boolean(),
  needs_password_change: z.boolean(),
  org_unit_id: z.number().nullable(),
  display_name: z.string().nullable(),
  jira_user_id: z.number().nullable(),
});

export const userUpdateSchema = z.object({
  email: z.string().email().optional(),
  full_name: z.string().nullable().optional(),
  role: z.string().optional(),
  org_unit_ids: z.array(z.number()).optional(),
  is_active: z.boolean().optional(),
});

export const jiraUserResponseSchema = z.object({
  id: z.number(),
  jira_account_id: z.string(),
  display_name: z.string(),
  email: z.string().email().nullable(),
  avatar_url: z.string().nullable(),
  is_active: z.boolean(),
  weekly_quota: z.number(),
  org_unit_id: z.number().nullable(),
  user_id: z.number().nullable(),
});

export const jiraUserUpdateSchema = z.object({
  org_unit_id: z.number().nullable().optional(),
  is_active: z.boolean().optional(),
  weekly_quota: z.number().optional(),
});

export type UserResponse = z.infer<typeof userResponseSchema>;
export type UserUpdate = z.infer<typeof userUpdateSchema>;
export type JiraUserResponse = z.infer<typeof jiraUserResponseSchema>;
export type JiraUserUpdate = z.infer<typeof jiraUserUpdateSchema>;
