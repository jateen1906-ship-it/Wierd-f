import { z } from 'zod';
import type {
  CanonicalIngredient,
  IngredientCategory,
  MeasurementUnit,
  RecipeIngredient,
} from '@food-evolution/types';
import { entityIdSchema } from './common.js';

/**
 * Standard measurement units schema
 */
export const measurementUnitSchema = z.enum([
  'g',
  'kg',
  'ml',
  'l',
  'cup',
  'tbsp',
  'tsp',
  'piece',
  'pinch',
  'packet',
  'slice',
  'custom',
]) satisfies z.ZodType<MeasurementUnit>;

/**
 * Ingredient category schema
 */
export const ingredientCategorySchema = z.enum([
  'staple',
  'dairy',
  'vegetable',
  'fruit',
  'spice_seasoning',
  'sauce_condiment',
  'protein',
  'snack_instant',
  'oil_fat',
  'bakery',
  'other',
]) satisfies z.ZodType<IngredientCategory>;

/**
 * Canonical catalog ingredient schema
 */
export const canonicalIngredientSchema = z.object({
  id: entityIdSchema,
  name: z
    .string()
    .trim()
    .min(1, 'Ingredient name cannot be empty')
    .max(100, 'Ingredient name cannot exceed 100 characters'),
  category: ingredientCategorySchema,
  commonSubstitutions: z.array(z.string().trim().min(1).max(100)).max(20).optional(),
  isCommonAllergen: z.boolean().optional(),
}) satisfies z.ZodType<CanonicalIngredient>;

/**
 * Recipe ingredient instance schema
 */
export const recipeIngredientSchema = z.object({
  id: entityIdSchema,
  canonicalId: entityIdSchema.optional(),
  name: z
    .string()
    .trim()
    .min(1, 'Ingredient name cannot be empty')
    .max(100, 'Ingredient name cannot exceed 100 characters'),
  quantity: z
    .number()
    .positive('Quantity must be strictly positive')
    .max(10000, 'Quantity exceeds realistic bounds'),
  unit: z
    .string()
    .trim()
    .min(1, 'Unit cannot be empty')
    .max(30, 'Unit cannot exceed 30 characters'),
  preparation: z
    .string()
    .trim()
    .max(100, 'Preparation notes cannot exceed 100 characters')
    .optional(),
  isOptional: z.boolean().optional(),
  isCustomAddition: z.boolean().optional(),
}) satisfies z.ZodType<RecipeIngredient>;
