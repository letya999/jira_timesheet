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

export type OrgUnitResponse = z.infer<typeof orgUnitResponseSchema>;
export type OrgUnitTree = OrgUnitResponse & { children: OrgUnitTree[] };
export type OrgUnitCreate = z.infer<typeof orgUnitCreateSchema>;
