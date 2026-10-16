import type { EntityId } from './common.js';

/**
 * Standard culinary unit representations
 */
export type MeasurementUnit =
  | 'g'
  | 'kg'
  | 'ml'
  | 'l'
  | 'cup'
  | 'tbsp'
  | 'tsp'
  | 'piece'
  | 'pinch'
  | 'packet'
  | 'slice'
  | 'custom';

/**
 * High-level ingredient categories
 */
export type IngredientCategory =
  | 'staple'
  | 'dairy'
  | 'vegetable'
  | 'fruit'
  | 'spice_seasoning'
  | 'sauce_condiment'
  | 'protein'
  | 'snack_instant'
  | 'oil_fat'
  | 'bakery'
  | 'other';

/**
 * Canonical reference ingredient in the system catalog
 */
export interface CanonicalIngredient {
  readonly id: EntityId;
  readonly name: string;
  readonly category: IngredientCategory;
  readonly commonSubstitutions?: readonly string[];
  readonly isCommonAllergen?: boolean;
}

/**
 * An ingredient instance used within an experiment recipe
 */
export interface RecipeIngredient {
  readonly id: EntityId;
  readonly canonicalId?: EntityId;
  readonly name: string;
  readonly quantity: number;
  readonly unit: MeasurementUnit | string;
  readonly preparation?: string;
  readonly isOptional?: boolean;
  readonly isCustomAddition?: boolean;
}
