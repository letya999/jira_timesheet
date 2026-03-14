import { z } from 'zod';

export const calendarEventSchema = z.object({
  id: z.number(),
  date: z.string().date(),
  title: z.string(),
  type: z.string(),
  is_working_day: z.boolean(),
});

export type CalendarEvent = z.infer<typeof calendarEventSchema>;
