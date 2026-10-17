import { z } from 'zod';

/**
 * Valid sorting modes for discovering food experiments
 */
export const experimentSortSchema = z.enum(['trending', 'recent', 'remixes', 'cooks', 'votes']);

export type ExperimentSort = z.infer<typeof experimentSortSchema>;

/**
 * Zod validation schema for public experiment feed queries
 */
export const experimentQuerySchema = z.object({
  search: z.string().trim().max(100, 'Search term cannot exceed 100 characters').optional(),
  difficulty: z.enum(['easy', 'medium', 'hard']).optional(),
  canonicalIngredientId: z.string().trim().uuid('Invalid canonical ingredient UUID').optional(),
  creatorId: z.string().trim().uuid('Invalid creator UUID').optional(),
  creatorUsername: z.string().trim().max(50, 'Username cannot exceed 50 characters').optional(),
  rootOnly: z
    .preprocess((val) => {
      if (val === 'true' || val === true) return true;
      if (val === 'false' || val === false) return false;
      return undefined;
    }, z.boolean().optional())
    .optional(),
  sort: experimentSortSchema.default('trending'),
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

export type ExperimentQueryDto = z.infer<typeof experimentQuerySchema>;

/**
 * Zod validation schema for authenticated user's experiment history
 */
export const userExperimentsQuerySchema = z.object({
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

export type UserExperimentsQueryDto = z.infer<typeof userExperimentsQuerySchema>;
