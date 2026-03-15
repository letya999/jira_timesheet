import { z } from 'zod'

export const chatChunkSchema = z.object({
  stage: z.enum(['generating_sql', 'sql', 'running_query', 'data', 'complete', 'error']),
  sql: z.string().nullable().optional(),
  data: z.array(z.record(z.unknown())).nullable().optional(),
  answer: z.string().nullable().optional(),
  error: z.string().nullable().optional(),
})

export const chatMessageSchema = z.object({
  id: z.string(),
  role: z.enum(['user', 'assistant']),
  content: z.string(),
  sql: z.string().nullable().optional(),
  data: z.array(z.record(z.unknown())).nullable().optional(),
  createdAt: z.date(),
})

export const chatRequestSchema = z.object({
  message: z.string().min(1).max(2000),
})

export type ChatChunk = z.infer<typeof chatChunkSchema>
export type ChatMessage = z.infer<typeof chatMessageSchema>
export type ChatRequest = z.infer<typeof chatRequestSchema>
