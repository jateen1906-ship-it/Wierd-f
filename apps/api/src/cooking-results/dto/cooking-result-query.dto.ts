import { z } from 'zod';

/**
 * Zod validation schema for cooking results pagination and filtering
 */
export const cookingResultQuerySchema = z.object({
  experimentId: z.string().trim().uuid('Invalid experiment UUID').optional(),
  page: z.coerce
    .number({ invalid_type_error: 'Page must be a number' })
    .int('Page must be an integer')
    .min(1, 'Page must be at least 1')
    .default(1),
  limit: z.coerce
    .number({ invalid_type_error: 'Limit must be a number' })
    .int('Limit must be an integer')
    .min(1, 'Limit must be at least 1')
    .max(100, 'Limit cannot exceed 100')
    .default(20),
});

export type CookingResultQueryDto = z.infer<typeof cookingResultQuerySchema>;
