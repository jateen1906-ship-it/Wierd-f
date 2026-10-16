import { z } from 'zod';

/**
 * Validation schema for paginating the authenticated user's voting history.
 * Adheres to repository pagination conventions (page >= 1, 1 <= limit <= 100).
 * Never accepts a client-supplied userId.
 */
export const userVotesQuerySchema = z.object({
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

export type UserVotesQueryDto = z.infer<typeof userVotesQuerySchema>;
