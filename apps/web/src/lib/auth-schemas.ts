import { z } from 'zod';
import { usernameSchema } from '@food-evolution/validation';

/**
 * Login Form Validation Schema
 * Mirrors backend LoginDto requirements: valid email format, non-empty password.
 */
export const loginFormSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, 'Email is required')
    .email('Invalid email address format')
    .max(255, 'Email cannot exceed 255 characters'),
  password: z
    .string()
    .min(1, 'Password is required')
    .max(128, 'Password cannot exceed 128 characters'),
});

export type LoginFormData = z.infer<typeof loginFormSchema>;

/**
 * Registration Form Validation Schema
 * Enforces backend RegisterDto requirements + frontend password confirmation.
 */
export const registerFormSchema = z
  .object({
    username: usernameSchema,
    displayName: z
      .string()
      .trim()
      .max(100, 'Display name cannot exceed 100 characters')
      .optional()
      .or(z.literal('')),
    email: z
      .string()
      .trim()
      .min(1, 'Email is required')
      .email('Invalid email address format')
      .max(255, 'Email cannot exceed 255 characters'),
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters long')
      .max(128, 'Password cannot exceed 128 characters'),
    confirmPassword: z.string().min(1, 'Please confirm your password'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

export type RegisterFormData = z.infer<typeof registerFormSchema>;
