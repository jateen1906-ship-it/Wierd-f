import { z } from 'zod';
import type { DifficultyLevel } from '@food-evolution/types';

export const MEASUREMENT_UNITS = [
  'packet',
  'piece',
  'slice',
  'cup',
  'tbsp',
  'tsp',
  'g',
  'kg',
  'ml',
  'l',
  'pinch',
  'custom',
] as const;

export type MeasurementUnit = (typeof MEASUREMENT_UNITS)[number];

export const TRANSFORMATION_OPTIONS = [
  {
    type: 'ingredient_added' as const,
    label: 'Ingredient Added',
    description: 'Added a new spice, topping, or component',
  },
  {
    type: 'ingredient_removed' as const,
    label: 'Ingredient Removed',
    description: 'Left out an ingredient for dietary or taste reasons',
  },
  {
    type: 'ingredient_substituted' as const,
    label: 'Ingredient Substituted',
    description: 'Swapped one ingredient for a hostel or budget alternative',
  },
  {
    type: 'quantity_changed' as const,
    label: 'Quantity Changed',
    description: 'Adjusted ratios or amounts for portion or flavor',
  },
  {
    type: 'cooking_method_changed' as const,
    label: 'Cooking Method Changed',
    description: 'Switched from stove to kettle, microwave, iron, or pan',
  },
  {
    type: 'cooking_time_changed' as const,
    label: 'Cooking Time Changed',
    description: 'Increased or decreased simmer, bake, or fry duration',
  },
  {
    type: 'spice_level_changed' as const,
    label: 'Spice Level Changed',
    description: 'Boosted chili or toned down heat',
  },
  {
    type: 'ratio_changed' as const,
    label: 'Ratio Adjusted',
    description: 'Tweaked water-to-noodle, sauce-to-base proportions',
  },
  {
    type: 'technique_changed' as const,
    label: 'Technique Changed',
    description: 'Different preparation technique (e.g. toasted before boiling)',
  },
  {
    type: 'constraint_adjusted' as const,
    label: 'Hostel/Budget Constraint',
    description: 'Optimized for kettle-only cooking or sub-₹50 budget',
  },
] as const;

export const ingredientFormSchema = z.object({
  id: z.string().optional(),
  name: z
    .string()
    .trim()
    .min(1, 'Ingredient name is required')
    .max(100, 'Ingredient name cannot exceed 100 characters'),
  quantity: z.coerce
    .number({ invalid_type_error: 'Quantity must be a number' })
    .positive('Quantity must be greater than 0')
    .max(10000, 'Quantity exceeds realistic bounds'),
  unit: z.string().trim().min(1, 'Unit is required').max(30, 'Unit cannot exceed 30 characters'),
  preparation: z
    .string()
    .trim()
    .max(100, 'Preparation notes cannot exceed 100 characters')
    .optional(),
  canonicalId: z.string().uuid('Invalid canonical ID').optional().or(z.literal('')),
  isOptional: z.boolean().default(false),
  isCustomAddition: z.boolean().default(false),
});

export type IngredientFormData = z.infer<typeof ingredientFormSchema>;

export const preparationStepFormSchema = z.object({
  stepNumber: z.number().int().positive('Step number must be positive'),
  instruction: z
    .string()
    .trim()
    .min(3, 'Instruction must be at least 3 characters')
    .max(1000, 'Instruction cannot exceed 1000 characters'),
  durationMinutes: z.coerce
    .number()
    .nonnegative('Duration cannot be negative')
    .max(360, 'Duration cannot exceed 6 hours')
    .optional(),
  safetyTip: z.string().trim().max(300, 'Safety tip cannot exceed 300 characters').optional(),
  isCritical: z.boolean().default(false),
});

export type PreparationStepFormData = z.infer<typeof preparationStepFormSchema>;

export const costEstimateFormSchema = z
  .object({
    min: z.coerce
      .number({ invalid_type_error: 'Min cost must be a number' })
      .nonnegative('Minimum cost cannot be negative')
      .max(100000, 'Minimum cost exceeds limit'),
    max: z.coerce
      .number({ invalid_type_error: 'Max cost must be a number' })
      .nonnegative('Maximum cost cannot be negative')
      .max(100000, 'Maximum cost exceeds limit'),
    currency: z.literal('INR').default('INR'),
  })
  .refine((val) => val.max >= val.min, {
    message: 'Maximum cost must be greater than or equal to minimum cost',
    path: ['max'],
  });

export type CostEstimateFormData = z.infer<typeof costEstimateFormSchema>;

export const transformationFormSchema = z.object({
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
    .min(1, 'Description cannot be empty')
    .max(300, 'Description cannot exceed 300 characters'),
  previousValue: z.string().trim().max(100).optional(),
  newValue: z.string().trim().max(100).optional(),
});

export type TransformationFormData = z.infer<typeof transformationFormSchema>;

export const createExperimentFormSchema = z.object({
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
  difficulty: z.enum(['easy', 'medium', 'hard', 'chaos']).default('medium'),
  estimatedTimeMinutes: z.coerce
    .number({ invalid_type_error: 'Estimated time must be a number' })
    .int('Estimated time must be whole minutes')
    .positive('Estimated time must be positive')
    .max(360, 'Cooking time cannot exceed 6 hours'),
  estimatedCost: costEstimateFormSchema,
  ingredients: z
    .array(ingredientFormSchema)
    .min(1, 'At least 1 ingredient is required')
    .max(50, 'Cannot exceed 50 ingredients'),
  steps: z
    .array(preparationStepFormSchema)
    .min(1, 'At least 1 preparation step is required')
    .max(30, 'Cannot exceed 30 steps'),
  heroMediaUrl: z.string().trim().url('Must be a valid URL').optional().or(z.literal('')),
});

export type CreateExperimentFormData = z.infer<typeof createExperimentFormSchema>;

export const remixExperimentFormSchema = z.object({
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
  difficulty: z.enum(['easy', 'medium', 'hard', 'chaos']).default('medium'),
  estimatedTimeMinutes: z.coerce
    .number({ invalid_type_error: 'Estimated time must be a number' })
    .int('Estimated time must be whole minutes')
    .positive('Estimated time must be positive')
    .max(360, 'Cooking time cannot exceed 6 hours')
    .optional(),
  estimatedCost: costEstimateFormSchema.optional(),
  transformations: z
    .array(transformationFormSchema)
    .min(1, 'At least 1 transformation diff is required when remixing an experiment')
    .max(20, 'Cannot exceed 20 transformations per remix'),
  ingredients: z
    .array(ingredientFormSchema)
    .min(1, 'At least 1 ingredient is required')
    .max(50, 'Cannot exceed 50 ingredients'),
  steps: z
    .array(preparationStepFormSchema)
    .min(1, 'At least 1 preparation step is required')
    .max(30, 'Cannot exceed 30 steps'),
  heroMediaUrl: z.string().trim().url('Must be a valid URL').optional().or(z.literal('')),
});

export type RemixExperimentFormData = z.infer<typeof remixExperimentFormSchema>;
