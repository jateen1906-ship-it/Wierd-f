import { z } from 'zod';
import {
  costEstimateSchema,
  difficultyLevelSchema,
  entityIdSchema,
  mediaReferenceSchema,
  recipeIngredientSchema,
  preparationStepSchema,
} from '@food-evolution/validation';

/**
 * Single ingredient input schema for experiment creation
 */
export const experimentIngredientInputSchema = recipeIngredientSchema.omit({ id: true }).extend({
  id: entityIdSchema.optional(),
});

export type ExperimentIngredientInput = z.infer<typeof experimentIngredientInputSchema>;

/**
 * Root Experiment Creation Schema
 * Enforces validation rules for a fresh food experiment node.
 */
export const createExperimentSchema = z.object({
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
    .array(experimentIngredientInputSchema)
    .min(1, 'Experiment must contain at least 1 ingredient')
    .max(50, 'Cannot exceed 50 ingredients'),
  steps: z
    .array(preparationStepSchema)
    .min(1, 'Experiment must contain at least 1 preparation step')
    .max(30, 'Cannot exceed 30 steps'),
  difficulty: difficultyLevelSchema.default('medium'),
  estimatedCost: costEstimateSchema,
  estimatedTimeMinutes: z
    .number()
    .int('Estimated time must be an integer')
    .positive('Estimated time must be positive')
    .max(360, 'Estimated time cannot exceed 6 hours'),
  heroMedia: mediaReferenceSchema.optional(),
});

export type CreateExperimentDto = z.infer<typeof createExperimentSchema>;
