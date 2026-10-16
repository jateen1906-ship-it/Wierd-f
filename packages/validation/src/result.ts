import { z } from 'zod';
import type { CookingOutcomeTag, CookingResult } from '@food-evolution/types';
import { entityIdSchema, isoTimestampSchema, mediaReferenceSchema } from './common.js';

/**
 * Cooking outcome tags schema embracing both perfection and chaotic failures
 */
export const cookingOutcomeTagSchema = z.enum([
  'perfection',
  'unexpectedly_worked',
  'burned_it',
  'texture_disaster',
  'flavor_bomb',
  'hostel_survival',
  'needs_remix',
  'total_chaos',
]) satisfies z.ZodType<CookingOutcomeTag>;

/**
 * Full Cooking Result entity schema
 */
export const cookingResultSchema = z.object({
  id: entityIdSchema,
  experimentId: entityIdSchema,
  userId: entityIdSchema,
  media: z
    .array(mediaReferenceSchema)
    .min(1, 'At least 1 photo/video proof is required')
    .max(10, 'Cannot exceed 10 media items'),
  caption: z.string().trim().max(500, 'Caption cannot exceed 500 characters').optional(),
  notes: z.string().trim().max(2000, 'Notes cannot exceed 2000 characters').optional(),
  outcomeTag: cookingOutcomeTagSchema,
  tasteRating: z
    .number()
    .int()
    .min(1, 'Rating must be between 1 and 5')
    .max(5, 'Rating must be between 1 and 5'),
  textureRating: z
    .number()
    .int()
    .min(1, 'Rating must be between 1 and 5')
    .max(5, 'Rating must be between 1 and 5')
    .optional(),
  wouldMakeAgain: z.boolean(),
  modificationsMade: z.string().trim().max(500).optional(),
  likesCount: z.number().int().nonnegative(),
  createdAt: isoTimestampSchema,
  updatedAt: isoTimestampSchema.optional(),
}) satisfies z.ZodType<CookingResult>;

/**
 * Input DTO schema for posting a cooking result
 */
export const createCookingResultInputSchema = z.object({
  experimentId: entityIdSchema,
  media: z.array(mediaReferenceSchema).min(1, 'At least 1 photo/video proof is required').max(10),
  caption: z.string().trim().max(500).optional(),
  notes: z.string().trim().max(2000).optional(),
  outcomeTag: cookingOutcomeTagSchema,
  tasteRating: z.number().int().min(1, 'Taste rating must be between 1 and 5').max(5),
  textureRating: z
    .number()
    .int()
    .min(1, 'Texture rating must be between 1 and 5')
    .max(5)
    .optional(),
  wouldMakeAgain: z.boolean(),
  modificationsMade: z.string().trim().max(500).optional(),
});
