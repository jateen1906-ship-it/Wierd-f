import { z } from 'zod';
import { ingredientCategorySchema } from '@food-evolution/validation';

/**
 * Zod validation schema for ingredient search and pagination query parameters
 */
export const ingredientQuerySchema = z.object({
  query: z.string().trim().max(100, 'Search query cannot exceed 100 characters').optional(),
  category: ingredientCategorySchema.optional(),
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

export type IngredientQueryDto = z.infer<typeof ingredientQuerySchema>;
