import { z } from 'zod';

export const loginRequestSchema = z.object({
  username: z.string().min(1, 'Username is required'),
  password: z.string().min(1, 'Password is required'),
});

export const tokenResponseSchema = z.object({
  access_token: z.string(),
  token_type: z.string(),
});

export const passwordChangeSchema = z.object({
  new_password: z.string().min(8, 'Password must be at least 8 characters'),
});

export type LoginRequest = z.infer<typeof loginRequestSchema>;
export type TokenResponse = z.infer<typeof tokenResponseSchema>;
export type PasswordChangeRequest = z.infer<typeof passwordChangeSchema>;
