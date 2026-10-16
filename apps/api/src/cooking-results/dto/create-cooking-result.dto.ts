import { createCookingResultInputSchema } from '@food-evolution/validation';
import type { z } from 'zod';

/**
 * Schema for creating a cooking result
 * Note: userId is NEVER accepted in the body; it is strictly derived from the JWT authentication context
 */
export const createCookingResultSchema = createCookingResultInputSchema;

export type CreateCookingResultDto = z.infer<typeof createCookingResultSchema>;
