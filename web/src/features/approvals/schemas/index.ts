import { z } from 'zod';

export const approvalStatusSchema = z.enum(['PENDING', 'APPROVED', 'REJECTED']);

export const approvalResponseSchema = z.object({
  id: z.number(),
  entity_id: z.number(),
  entity_type: z.string(),
  status: approvalStatusSchema,
  approver_id: z.number().nullable(),
  comment: z.string().nullable(),
  step_order: z.number(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});

export const approvalActionSchema = z.object({
  comment: z.string().optional(),
});

export type ApprovalStatus = z.infer<typeof approvalStatusSchema>;
export type ApprovalResponse = z.infer<typeof approvalResponseSchema>;
export type ApprovalAction = z.infer<typeof approvalActionSchema>;
