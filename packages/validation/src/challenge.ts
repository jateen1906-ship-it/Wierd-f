import { z } from 'zod';
import type {
  Challenge,
  ChallengeConstraints,
  ChallengeStatus,
  ChallengeSubmission,
} from '@food-evolution/types';
import { costEstimateSchema, entityIdSchema, isoTimestampSchema } from './common.js';

/**
 * Challenge status schema
 */
export const challengeStatusSchema = z.enum([
  'upcoming',
  'active',
  'completed',
  'archived',
]) satisfies z.ZodType<ChallengeStatus>;

/**
 * Challenge constraints schema
 */
export const challengeConstraintsSchema = z.object({
  maxCost: costEstimateSchema.optional(),
  maxTimeMinutes: z.number().int().positive().max(360).optional(),
  requiredIngredients: z.array(z.string().trim().min(1).max(50)).max(10).optional(),
  maxIngredientCount: z.number().int().positive().max(30).optional(),
  allowedAppliances: z.array(z.string().trim().min(1).max(50)).max(10).optional(),
}) satisfies z.ZodType<ChallengeConstraints>;

/**
 * Full Challenge entity schema
 */
export const challengeSchema = z.object({
  id: entityIdSchema,
  title: z
    .string()
    .trim()
    .min(3, 'Challenge title must be at least 3 characters')
    .max(150, 'Title cannot exceed 150 characters'),
  slug: z
    .string()
    .trim()
    .min(3)
    .max(100)
    .regex(/^[a-z0-9-]+$/, 'Slug must be lower-case alphanumeric with hyphens'),
  description: z.string().trim().min(10, 'Description must be at least 10 characters').max(2000),
  prompt: z.string().trim().min(5, 'Prompt must be at least 5 characters').max(500),
  status: challengeStatusSchema,
  constraints: challengeConstraintsSchema.optional(),
  startDate: isoTimestampSchema,
  endDate: isoTimestampSchema,
  sponsorName: z.string().trim().max(100).optional(),
  sponsorLogoUrl: z.string().url('Sponsor logo must be a valid URL').optional(),
  submissionsCount: z.number().int().nonnegative(),
  createdAt: isoTimestampSchema,
  updatedAt: isoTimestampSchema.optional(),
}) satisfies z.ZodType<Challenge>;

/**
 * Challenge submission link schema
 */
export const challengeSubmissionSchema = z.object({
  id: entityIdSchema,
  challengeId: entityIdSchema,
  experimentId: entityIdSchema,
  creatorId: entityIdSchema,
  votesCount: z.number().int().nonnegative(),
  createdAt: isoTimestampSchema,
  updatedAt: isoTimestampSchema.optional(),
}) satisfies z.ZodType<ChallengeSubmission>;
