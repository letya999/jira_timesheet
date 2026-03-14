import { z } from 'zod';

export const leaveTypeSchema = z.enum(['VACATION', 'SICK_LEAVE', 'DAY_OFF', 'OTHER']);
export const leaveStatusSchema = z.enum(['PENDING', 'APPROVED', 'REJECTED', 'CANCELLED']);

export const leaveCreateSchema = z.object({
  type: leaveTypeSchema.default('VACATION'),
  start_date: z.string().date(),
  end_date: z.string().date(),
  reason: z.string().nullable().optional(),
});

export const leaveResponseSchema = z.object({
  id: z.number(),
  user_id: z.number(),
  type: leaveTypeSchema,
  start_date: z.string().date(),
  end_date: z.string().date(),
  status: leaveStatusSchema,
  reason: z.string().nullable(),
  approver_id: z.number().nullable(),
  comment: z.string().nullable(),
  current_step_order: z.number(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
  user_full_name: z.string().nullable(),
  user_avatar_url: z.string().nullable(),
  approver_full_name: z.string().nullable(),
});

export type LeaveType = z.infer<typeof leaveTypeSchema>;
export type LeaveStatus = z.infer<typeof leaveStatusSchema>;
export type LeaveCreate = z.infer<typeof leaveCreateSchema>;
export type LeaveResponse = z.infer<typeof leaveResponseSchema>;
