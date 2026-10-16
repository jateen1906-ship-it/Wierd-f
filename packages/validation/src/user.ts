import { z } from 'zod';
import type {
  CookingSkillLevel,
  DietaryRestriction,
  TasteSignal,
  UserPreferences,
} from '@food-evolution/types';
import { entityIdSchema, isoTimestampSchema } from './common.js';

/**
 * Dietary restriction schema
 */
export const dietaryRestrictionSchema = z.enum([
  'vegetarian',
  'non-vegetarian',
  'vegan',
  'eggetarian',
  'jain',
  'halal',
  'gluten-free',
  'dairy-free',
]) satisfies z.ZodType<DietaryRestriction>;

/**
 * Cooking skill / persona level schema
 */
export const cookingSkillLevelSchema = z.enum([
  'beginner',
  'hostel_experimenter',
  'home_cook',
  'food_creator',
  'advanced',
]) satisfies z.ZodType<CookingSkillLevel>;

/**
 * User taste and dietary preferences schema
 */
export const userPreferencesSchema = z.object({
  dietaryRestrictions: z
    .array(dietaryRestrictionSchema)
    .max(10, 'Cannot specify more than 10 dietary restrictions'),
  spiceTolerance: z.enum(['mild', 'medium', 'high', 'insane']),
  preferredCuisines: z
    .array(z.string().trim().min(1).max(50))
    .max(20, 'Cannot specify more than 20 preferred cuisines'),
  dislikedIngredients: z
    .array(z.string().trim().min(1).max(50))
    .max(50, 'Cannot specify more than 50 disliked ingredients'),
  availableEquipment: z
    .array(z.string().trim().min(1).max(50))
    .max(30, 'Cannot specify more than 30 equipment items'),
  budgetPreference: z.enum(['budget', 'moderate', 'flexible']),
}) satisfies z.ZodType<UserPreferences>;

/**
 * Username validation rules (3-30 alphanumeric characters, underscores, or hyphens)
 */
export const usernameSchema = z
  .string()
  .trim()
  .min(3, 'Username must be at least 3 characters')
  .max(30, 'Username cannot exceed 30 characters')
  .regex(
    /^[a-zA-Z0-9_-]+$/,
    'Username can only contain alphanumeric characters, underscores, or hyphens',
  );

/**
 * User profile update / registration schema
 */
export const userProfileSchema = z.object({
  username: usernameSchema,
  displayName: z
    .string()
    .trim()
    .min(1, 'Display name cannot be empty')
    .max(50, 'Display name cannot exceed 50 characters'),
  bio: z.string().trim().max(300, 'Bio cannot exceed 300 characters').optional(),
  avatarUrl: z.string().url('Avatar must be a valid URL').optional(),
  preferences: userPreferencesSchema,
  skillLevel: cookingSkillLevelSchema,
});

/**
 * Minimal Taste Signal schema
 */
export const tasteSignalSchema = z.object({
  id: entityIdSchema,
  userId: entityIdSchema,
  signalType: z.enum([
    'ingredient_liked',
    'ingredient_avoided',
    'cuisine_affinity',
    'spice_preference',
    'budget_preference',
    'failure_tolerance',
  ]),
  targetEntity: z
    .string()
    .trim()
    .min(1, 'Target entity cannot be empty')
    .max(100, 'Target entity cannot exceed 100 characters'),
  weight: z.number().min(-1).max(1, 'Weight must be between -1.0 and 1.0'),
  createdAt: isoTimestampSchema,
}) satisfies z.ZodType<TasteSignal>;
