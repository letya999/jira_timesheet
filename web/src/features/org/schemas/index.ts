import { z } from 'zod';

export const orgUnitResponseSchema = z.object({
  id: z.number(),
  name: z.string(),
  parent_id: z.number().nullable(),
  reporting_period: z.string(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});

export const orgUnitTreeSchema: z.ZodType<OrgUnitTree> = z.lazy(() =>
  orgUnitResponseSchema.extend({
    children: z.array(orgUnitTreeSchema),
  })
);

export const orgUnitCreateSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  parent_id: z.number().nullable().optional(),
  reporting_period: z.enum(['weekly', 'monthly', 'biweekly']).default('weekly'),
});

// Role schemas
export const roleResponseSchema = z.object({
  id: z.number(),
  name: z.string(),
  is_system: z.boolean(),
});
export const roleCreateSchema = z.object({ name: z.string().min(1) });

// Unit role assignment schemas
export const unitRoleAssignmentSchema = z.object({
  id: z.number(),
  unit_id: z.number(),
  user_id: z.number(),
  role_id: z.number(),
  role: roleResponseSchema.optional(),
});

// Approval route schemas
export const approvalRouteSchema = z.object({
  id: z.number(),
  unit_id: z.number(),
  target_type: z.enum(['leave', 'timesheet']),
  step_order: z.number(),
  role_id: z.number(),
  role: roleResponseSchema.optional(),
});
export const approvalRouteCreateSchema = z.object({
  unit_id: z.number(),
  target_type: z.enum(['leave', 'timesheet']),
  step_order: z.number().min(1),
  role_id: z.number(),
});

export type OrgUnitResponse = z.infer<typeof orgUnitResponseSchema>;
export type OrgUnitTree = OrgUnitResponse & { children: OrgUnitTree[] };
export type OrgUnitCreate = z.infer<typeof orgUnitCreateSchema>;
export type RoleResponse = z.infer<typeof roleResponseSchema>;
export type RoleCreate = z.infer<typeof roleCreateSchema>;
export type UnitRoleAssignment = z.infer<typeof unitRoleAssignmentSchema>;
export type ApprovalRoute = z.infer<typeof approvalRouteSchema>;
export type ApprovalRouteCreate = z.infer<typeof approvalRouteCreateSchema>;
