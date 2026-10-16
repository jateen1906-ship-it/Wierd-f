import type { EntityId, IsoTimestamp, Timestamped } from './common.js';

/**
 * Dietary restriction categories
 */
export type DietaryRestriction =
  | 'vegetarian'
  | 'non-vegetarian'
  | 'vegan'
  | 'eggetarian'
  | 'jain'
  | 'halal'
  | 'gluten-free'
  | 'dairy-free';

/**
 * Cooking skill/style self-identification
 */
export type CookingSkillLevel =
  'beginner' | 'hostel_experimenter' | 'home_cook' | 'food_creator' | 'advanced';

/**
 * Structured user dietary and taste preferences
 */
export interface UserPreferences {
  readonly dietaryRestrictions: readonly DietaryRestriction[];
  readonly spiceTolerance: 'mild' | 'medium' | 'high' | 'insane';
  readonly preferredCuisines: readonly string[];
  readonly dislikedIngredients: readonly string[];
  readonly availableEquipment: readonly string[];
  readonly budgetPreference: 'budget' | 'moderate' | 'flexible';
}

/**
 * Core User entity representing a platform creator or cook
 */
export interface User extends Timestamped {
  readonly id: EntityId;
  readonly username: string;
  readonly displayName: string;
  readonly bio?: string;
  readonly avatarUrl?: string;
  readonly preferences: UserPreferences;
  readonly skillLevel: CookingSkillLevel;
  readonly stats: UserStats;
}

/**
 * Aggregated user engagement stats
 */
export interface UserStats {
  readonly experimentsCount: number;
  readonly remixesCount: number;
  readonly resultsCount: number;
  readonly votesCount: number;
  readonly followersCount: number;
  readonly followingCount: number;
}

/**
 * Minimal taste signal / preference event
 */
export interface TasteSignal {
  readonly id: EntityId;
  readonly userId: EntityId;
  readonly signalType:
    | 'ingredient_liked'
    | 'ingredient_avoided'
    | 'cuisine_affinity'
    | 'spice_preference'
    | 'budget_preference'
    | 'failure_tolerance';
  readonly targetEntity: string;
  readonly weight: number;
  readonly createdAt: IsoTimestamp;
}
