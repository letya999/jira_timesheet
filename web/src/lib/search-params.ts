import { z } from 'zod';

// Shared primitives
export const paginationSchema = z.object({
  page: z.number().int().min(1).catch(1),
  limit: z.number().int().min(1).max(200).catch(50),
});

export const dateRangeSchema = z.object({
  from: z.string().date().optional(),
  to: z.string().date().optional(),
});

export const sortSchema = z.object({
  sortBy: z.string().optional(),
  sortDir: z.enum(['asc', 'desc']).catch('desc'),
});

// Domain-specific search params
export const timesheetFilterSchema = paginationSchema
  .merge(dateRangeSchema)
  .merge(sortSchema)
  .extend({
    userId: z.number().int().optional(),
    type: z.enum(['JIRA', 'MANUAL']).optional(),
    status: z.string().optional(),
    category: z.string().optional(),
    projectKey: z.string().optional(),
  });

export const approvalFilterSchema = paginationSchema
  .merge(dateRangeSchema)
  .extend({
    status: z.enum(['DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED']).optional(),
    teamId: z.number().int().optional(),
  });

export const leaveFilterSchema = paginationSchema
  .merge(dateRangeSchema)
  .extend({
    status: z.string().optional(),
    leaveType: z.string().optional(),
  });

export const notificationFilterSchema = z.object({
  unreadOnly: z.boolean().catch(false),
});

export const reportFilterSchema = paginationSchema
  .merge(dateRangeSchema)
  .extend({
    projectKey: z.string().optional(),
    teamId: z.number().int().optional(),
    userId: z.number().int().optional(),
    category: z.string().optional(),
    sprint: z.string().optional(),
  });

export const userFilterSchema = paginationSchema.extend({
  search: z.string().optional(),
  isActive: z.boolean().optional(),
});

// Type exports
export type PaginationParams = z.infer<typeof paginationSchema>;
export type DateRangeParams = z.infer<typeof dateRangeSchema>;
export type SortParams = z.infer<typeof sortSchema>;
export type TimesheetFilterParams = z.infer<typeof timesheetFilterSchema>;
export type ApprovalFilterParams = z.infer<typeof approvalFilterSchema>;
export type LeaveFilterParams = z.infer<typeof leaveFilterSchema>;
export type NotificationFilterParams = z.infer<typeof notificationFilterSchema>;
export type ReportFilterParams = z.infer<typeof reportFilterSchema>;
export type UserFilterParams = z.infer<typeof userFilterSchema>;
