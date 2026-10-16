import { z } from 'zod';
import {
  costEstimateSchema,
  difficultyLevelSchema,
  experimentTransformationSchema,
  mediaReferenceSchema,
  preparationStepSchema,
} from '@food-evolution/validation';
import { experimentIngredientInputSchema } from './create-experiment.dto';

/**
 * Remix Experiment Input Schema
 * Requires clear structured transformations describing how this branch evolved from the parent.
 */
export const remixExperimentSchema = z.object({
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
  transformations: z
    .array(experimentTransformationSchema)
    .min(1, 'At least 1 transformation diff is required when remixing an experiment')
    .max(20, 'Cannot exceed 20 transformations per remix'),
  ingredients: z
    .array(experimentIngredientInputSchema)
    .min(1, 'Remix must contain at least 1 ingredient')
    .max(50, 'Cannot exceed 50 ingredients'),
  steps: z
    .array(preparationStepSchema)
    .min(1, 'Remix must contain at least 1 preparation step')
    .max(30, 'Cannot exceed 30 steps'),
  difficulty: difficultyLevelSchema.optional(),
  estimatedCost: costEstimateSchema.optional(),
  estimatedTimeMinutes: z
    .number()
    .int('Estimated time must be an integer')
    .positive('Estimated time must be positive')
    .max(360, 'Estimated time cannot exceed 6 hours')
    .optional(),
  heroMedia: mediaReferenceSchema.optional(),
});

export type RemixExperimentDto = z.infer<typeof remixExperimentSchema>;
