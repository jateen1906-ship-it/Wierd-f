import type { Experiment, ExperimentIngredient, User } from '@prisma/client';

/**
 * Publicly safe creator representation
 */
export interface SafeCreator {
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  skillLevel: string;
}

/**
 * Normalized ingredient representation attached to an experiment
 */
export interface ExperimentIngredientResponse {
  id: string;
  canonicalId: string | null;
  name: string;
  quantity: number;
  unit: string;
  preparation: string | null;
  isOptional: boolean;
  isCustomAddition: boolean;
}

/**
 * Complete Safe Experiment Response DTO
 */
export interface ExperimentResponse {
  id: string;
  creatorId: string;
  creator: SafeCreator;
  parentId: string | null;
  rootId: string | null;
  branchDepth: number;
  transformations: unknown | null;
  title: string;
  description: string;
  ingredients: ExperimentIngredientResponse[];
  steps: unknown;
  difficulty: string;
  estimatedCost: unknown;
  estimatedTimeMinutes: number;
  heroMedia: unknown | null;
  aiMetadata: unknown | null;
  safetyStatus: string;
  remixCount: number;
  cookCount: number;
  voteCount: number;
  resultCount: number;
  createdAt: string;
  updatedAt: string;
}

export function toSafeCreator(
  user: Pick<User, 'id' | 'username' | 'displayName' | 'avatarUrl' | 'skillLevel'>,
): SafeCreator {
  return {
    id: user.id,
    username: user.username,
    displayName: user.displayName,
    avatarUrl: user.avatarUrl,
    skillLevel: user.skillLevel,
  };
}

export function toExperimentIngredientResponse(
  ingredient: ExperimentIngredient,
): ExperimentIngredientResponse {
  return {
    id: ingredient.id,
    canonicalId: ingredient.canonicalId,
    name: ingredient.name,
    quantity: ingredient.quantity,
    unit: ingredient.unit,
    preparation: ingredient.preparation,
    isOptional: ingredient.isOptional,
    isCustomAddition: ingredient.isCustomAddition,
  };
}

export function toExperimentResponse(
  experiment: Experiment & {
    creator: Pick<User, 'id' | 'username' | 'displayName' | 'avatarUrl' | 'skillLevel'>;
    ingredients?: ExperimentIngredient[];
  },
): ExperimentResponse {
  return {
    id: experiment.id,
    creatorId: experiment.creatorId,
    creator: toSafeCreator(experiment.creator),
    parentId: experiment.parentId,
    rootId: experiment.rootId,
    branchDepth: experiment.branchDepth,
    transformations: experiment.transformations ?? null,
    title: experiment.title,
    description: experiment.description,
    ingredients: (experiment.ingredients ?? []).map(toExperimentIngredientResponse),
    steps: experiment.steps,
    difficulty: experiment.difficulty,
    estimatedCost: experiment.estimatedCost ?? null,
    estimatedTimeMinutes: experiment.estimatedTimeMinutes,
    heroMedia: experiment.heroMedia ?? null,
    aiMetadata: experiment.aiMetadata ?? null,
    safetyStatus: experiment.safetyStatus,
    remixCount: experiment.remixCount,
    cookCount: experiment.cookCount,
    voteCount: experiment.voteCount,
    resultCount: experiment.resultCount,
    createdAt: experiment.createdAt.toISOString(),
    updatedAt: experiment.updatedAt.toISOString(),
  };
}
