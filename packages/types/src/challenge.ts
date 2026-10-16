import type { CostEstimate, EntityId, IsoTimestamp, Timestamped } from './common.js';

/**
 * Challenge operational lifecycle status
 */
export type ChallengeStatus = 'upcoming' | 'active' | 'completed' | 'archived';

/**
 * Challenge constraint requirements
 */
export interface ChallengeConstraints {
  readonly maxCost?: CostEstimate;
  readonly maxTimeMinutes?: number;
  readonly requiredIngredients?: readonly string[];
  readonly maxIngredientCount?: number;
  readonly allowedAppliances?: readonly string[];
}

/**
 * Community or brand-sponsored cooking challenge
 */
export interface Challenge extends Timestamped {
  readonly id: EntityId;
  readonly title: string;
  readonly slug: string;
  readonly description: string;
  readonly prompt: string;
  readonly status: ChallengeStatus;
  readonly constraints?: ChallengeConstraints;
  readonly startDate: IsoTimestamp;
  readonly endDate: IsoTimestamp;
  readonly sponsorName?: string;
  readonly sponsorLogoUrl?: string;
  readonly submissionsCount: number;
}

/**
 * Submission linking an experiment branch to an active challenge
 */
export interface ChallengeSubmission extends Timestamped {
  readonly id: EntityId;
  readonly challengeId: EntityId;
  readonly experimentId: EntityId;
  readonly creatorId: EntityId;
  readonly votesCount: number;
}
