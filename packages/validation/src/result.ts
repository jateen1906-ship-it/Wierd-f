import { z } from 'zod';
import type {
  CookingOutcomeTag,
  CookingResult,
  ResultReactionSummary,
} from '@food-evolution/types';
import { entityIdSchema, isoTimestampSchema, mediaReferenceSchema } from './common.js';
import { resultReactionTypeSchema } from './vote.js';

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

/**
 * Result reaction summary schema
 */
export const resultReactionSummarySchema = z.object({
  resultId: entityIdSchema,
  fireCount: z.number().int().nonnegative(),
  yuckCount: z.number().int().nonnegative(),
  respectCount: z.number().int().nonnegative(),
  laughCount: z.number().int().nonnegative(),
  mindBlownCount: z.number().int().nonnegative(),
  totalReactions: z.number().int().nonnegative(),
  likesCount: z.number().int().nonnegative(),
  userReaction: resultReactionTypeSchema.optional(),
}) satisfies z.ZodType<ResultReactionSummary>;

/**
 * Cast reaction input schema
 */
export const castReactionInputSchema = z
  .object({
    type: resultReactionTypeSchema.optional(),
    choice: resultReactionTypeSchema.optional(),
  })
  .refine((data) => data.type !== undefined || data.choice !== undefined, {
    message: 'Reaction type or choice is required',
  });
