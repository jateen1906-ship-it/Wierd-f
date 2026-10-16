import { z } from 'zod';
import { usernameSchema } from '@food-evolution/validation';

export const registerSchema = z.object({
  username: usernameSchema,
  email: z
    .string()
    .trim()
    .email('Invalid email address format')
    .max(255, 'Email cannot exceed 255 characters'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters long')
    .max(128, 'Password cannot exceed 128 characters'),
  displayName: z
    .string()
    .trim()
    .min(1, 'Display name cannot be empty')
    .max(100, 'Display name cannot exceed 100 characters')
    .optional(),
});

export type RegisterDto = z.infer<typeof registerSchema>;
