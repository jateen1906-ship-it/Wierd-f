import { z } from 'zod';
import type {
  AiExperimentMetadata,
  Experiment,
  ExperimentTransformation,
  PreparationStep,
} from '@food-evolution/types';
import {
  costEstimateSchema,
  difficultyLevelSchema,
  entityIdSchema,
  isoTimestampSchema,
  mediaReferenceSchema,
} from './common.js';
import { recipeIngredientSchema } from './ingredient.js';
import { safetyStatusSchema } from './safety.js';

/**
 * Cooking step schema
 */
export const preparationStepSchema = z.object({
  stepNumber: z.number().int().positive('Step number must be a positive integer'),
  instruction: z
    .string()
    .trim()
    .min(3, 'Step instruction must be at least 3 characters')
    .max(1000, 'Step instruction cannot exceed 1000 characters'),
  durationMinutes: z.number().nonnegative().max(360, 'Step duration exceeds 6 hours').optional(),
  temperatureCelsius: z
    .number()
    .min(-30)
    .max(400, 'Temperature outside realistic cooking bounds')
    .optional(),
  safetyTip: z.string().trim().max(300, 'Safety tip cannot exceed 300 characters').optional(),
  isCritical: z.boolean().optional(),
}) satisfies z.ZodType<PreparationStep>;

/**
 * Lineage transformation diff schema
 */
export const experimentTransformationSchema = z.object({
  type: z.enum([
    'ingredient_added',
    'ingredient_removed',
    'ingredient_substituted',
    'quantity_changed',
    'cooking_method_changed',
    'cooking_time_changed',
    'spice_level_changed',
    'ratio_changed',
    'technique_changed',
    'constraint_adjusted',
  ]),
  description: z
    .string()
    .trim()
    .min(1, 'Transformation description cannot be empty')
    .max(300, 'Description cannot exceed 300 characters'),
  previousValue: z.string().trim().max(100).optional(),
  newValue: z.string().trim().max(100).optional(),
}) satisfies z.ZodType<ExperimentTransformation>;

/**
 * AI experiment metadata schema
 */
export const aiExperimentMetadataSchema = z.object({
  rationale: z
    .string()
    .trim()
    .min(3, 'Rationale must be at least 3 characters')
    .max(1000, 'Rationale cannot exceed 1000 characters'),
  flavorProfile: z
    .array(z.string().trim().min(1).max(50))
    .max(10, 'Flavor profile cannot exceed 10 tags'),
  textureProfile: z
    .array(z.string().trim().min(1).max(50))
    .max(10, 'Texture profile cannot exceed 10 tags'),
  predictedSuccessScore: z.number().min(0).max(100).optional(),
  generatedByModel: z.string().trim().max(50).optional(),
}) satisfies z.ZodType<AiExperimentMetadata>;

/**
 * Full Experiment domain entity schema
 */
export const experimentSchema = z.object({
  id: entityIdSchema,
  creatorId: entityIdSchema,
  parentId: entityIdSchema.nullable(),
  rootId: entityIdSchema,
  branchDepth: z.number().int().nonnegative('Branch depth cannot be negative'),
  transformations: z.array(experimentTransformationSchema).max(20).optional(),
  title: z
    .string()
    .trim()
    .min(3, 'Title must be at least 3 characters')
    .max(120, 'Title cannot exceed 120 characters'),
  description: z
    .string()
    .trim()
    .min(5, 'Description must be at least 5 characters')
    .max(2000, 'Description cannot exceed 2000 characters'),
  ingredients: z
    .array(recipeIngredientSchema)
    .min(1, 'Experiment must contain at least 1 ingredient')
    .max(50, 'Cannot exceed 50 ingredients'),
  steps: z
    .array(preparationStepSchema)
    .min(1, 'Experiment must contain at least 1 preparation step')
    .max(30, 'Cannot exceed 30 steps'),
  difficulty: difficultyLevelSchema,
  estimatedCost: costEstimateSchema,
  estimatedTimeMinutes: z
    .number()
    .int()
    .positive('Cooking time must be positive')
    .max(360, 'Cooking time cannot exceed 6 hours'),
  heroMedia: mediaReferenceSchema.optional(),
  aiMetadata: aiExperimentMetadataSchema.optional(),
  safetyStatus: safetyStatusSchema,
  remixCount: z.number().int().nonnegative(),
  cookCount: z.number().int().nonnegative(),
  voteCount: z.number().int().nonnegative(),
  resultCount: z.number().int().nonnegative(),
  createdAt: isoTimestampSchema,
  updatedAt: isoTimestampSchema.optional(),
}) satisfies z.ZodType<Experiment>;

/**
 * Creation DTO schema for user or AI experiment generation
 */
export const createExperimentInputSchema = z.object({
  title: z
    .string()
    .trim()
    .min(3, 'Title must be at least 3 characters')
    .max(120, 'Title cannot exceed 120 characters'),
  description: z
    .string()
    .trim()
    .min(5, 'Description must be at least 5 characters')
    .max(2000, 'Description cannot exceed 2000 characters'),
  ingredients: z
    .array(recipeIngredientSchema.omit({ id: true }).extend({ id: entityIdSchema.optional() }))
    .min(1, 'At least 1 ingredient is required')
    .max(50),
  steps: z.array(preparationStepSchema).min(1, 'At least 1 preparation step is required').max(30),
  difficulty: difficultyLevelSchema,
  estimatedCost: costEstimateSchema,
  estimatedTimeMinutes: z.number().int().positive().max(360),
  parentId: entityIdSchema.nullable().default(null),
  transformations: z.array(experimentTransformationSchema).max(20).optional(),
});
