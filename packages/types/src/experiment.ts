import type {
  CostEstimate,
  DifficultyLevel,
  EntityId,
  IsoTimestamp,
  MediaReference,
  Timestamped,
} from './common.js';
import type { RecipeIngredient } from './ingredient.js';
import type { SafetyStatus } from './safety.js';

/**
 * Single cooking instruction step
 */
export interface PreparationStep {
  readonly stepNumber: number;
  readonly instruction: string;
  readonly durationMinutes?: number;
  readonly temperatureCelsius?: number;
  readonly safetyTip?: string;
  readonly isCritical?: boolean;
}

/**
 * Lineage transformation diff describing how this branch differs from its parent
 */
export interface ExperimentTransformation {
  readonly type:
    | 'ingredient_added'
    | 'ingredient_removed'
    | 'ingredient_substituted'
    | 'quantity_changed'
    | 'cooking_method_changed'
    | 'cooking_time_changed'
    | 'spice_level_changed'
    | 'ratio_changed'
    | 'technique_changed'
    | 'constraint_adjusted';
  readonly description: string;
  readonly previousValue?: string;
  readonly newValue?: string;
}

/**
 * AI-generated rationale and flavor profile metadata
 */
export interface AiExperimentMetadata {
  readonly rationale: string;
  readonly flavorProfile: readonly string[];
  readonly textureProfile: readonly string[];
  readonly predictedSuccessScore?: number;
  readonly generatedByModel?: string;
}

/**
 * Core Experiment entity representing a recipe/experiment node in the Living Food Graph
 */
export interface Experiment extends Timestamped {
  readonly id: EntityId;
  readonly creatorId: EntityId;

  // Living Food Graph Lineage
  readonly parentId: EntityId | null;
  readonly rootId: EntityId;
  readonly branchDepth: number;
  readonly transformations?: readonly ExperimentTransformation[];

  // Recipe & Content
  readonly title: string;
  readonly description: string;
  readonly ingredients: readonly RecipeIngredient[];
  readonly steps: readonly PreparationStep[];
  readonly difficulty: DifficultyLevel;
  readonly estimatedCost: CostEstimate;
  readonly estimatedTimeMinutes: number;
  readonly heroMedia?: MediaReference;

  // AI & Safety
  readonly aiMetadata?: AiExperimentMetadata;
  readonly safetyStatus: SafetyStatus;

  // Aggregate Stats
  readonly remixCount: number;
  readonly cookCount: number;
  readonly voteCount: number;
  readonly resultCount: number;
}

/**
 * Lightweight reference for lineage trees
 */
export interface ExperimentLineageNode {
  readonly id: EntityId;
  readonly title: string;
  readonly creatorId: EntityId;
  readonly parentId: EntityId | null;
  readonly rootId: EntityId;
  readonly branchDepth: number;
  readonly createdAt: IsoTimestamp;
  readonly remixCount: number;
  readonly cookCount: number;
}
