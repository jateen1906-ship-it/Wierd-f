import { z } from 'zod';
import type {
  CostEstimate,
  DifficultyLevel,
  MediaReference,
  PaginationParams,
} from '@food-evolution/types';

/**
 * Universal Entity ID schema (UUID or alphanumeric slug)
 */
export const entityIdSchema = z
  .string()
  .trim()
  .min(1, 'Entity ID cannot be empty')
  .max(64, 'Entity ID cannot exceed 64 characters');

/**
 * ISO 8601 UTC timestamp schema
 */
export const isoTimestampSchema = z
  .string()
  .datetime({ message: 'Invalid ISO 8601 UTC timestamp format' });

/**
 * Difficulty level schema
 */
export const difficultyLevelSchema = z.enum([
  'easy',
  'medium',
  'hard',
  'chaos',
]) satisfies z.ZodType<DifficultyLevel>;

/**
 * Supported currency codes schema
 */
export const currencyCodeSchema = z.enum(['INR', 'USD', 'EUR', 'GBP']);

/**
 * Estimated cost range schema
 */
export const costEstimateSchema = z
  .object({
    min: z
      .number()
      .nonnegative('Cost minimum cannot be negative')
      .max(100000, 'Cost minimum exceeds reasonable limit'),
    max: z
      .number()
      .nonnegative('Cost maximum cannot be negative')
      .max(100000, 'Cost maximum exceeds reasonable limit'),
    currency: currencyCodeSchema,
  })
  .refine((data) => data.max >= data.min, {
    message: 'Cost maximum must be greater than or equal to minimum',
    path: ['max'],
  }) satisfies z.ZodType<CostEstimate>;

/**
 * Media reference schema
 */
export const mediaReferenceSchema = z.object({
  id: entityIdSchema,
  url: z.string().url('Media reference must be a valid URL'),
  type: z.enum(['image', 'video']),
  thumbnailUrl: z.string().url('Thumbnail must be a valid URL').optional(),
  width: z.number().int().positive().max(10000).optional(),
  height: z.number().int().positive().max(10000).optional(),
  durationSeconds: z.number().positive().max(3600).optional(),
}) satisfies z.ZodType<MediaReference>;

/**
 * Cursor-based pagination parameters schema
 */
export const paginationParamsSchema = z.object({
  cursor: z.string().trim().max(256).optional(),
  limit: z.coerce
    .number()
    .int()
    .min(1, 'Limit must be at least 1')
    .max(100, 'Limit cannot exceed 100')
    .default(20),
}) satisfies z.ZodType<PaginationParams>;
