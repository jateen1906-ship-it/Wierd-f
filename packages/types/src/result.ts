import type { EntityId, MediaReference, Timestamped } from './common.js';
import type { ResultReactionType } from './vote.js';

/**
 * Outcome tags normalizing real-world cooking attempts and embracing failure/chaos
 */
export type CookingOutcomeTag =
  | 'perfection'
  | 'unexpectedly_worked'
  | 'burned_it'
  | 'texture_disaster'
  | 'flavor_bomb'
  | 'hostel_survival'
  | 'needs_remix'
  | 'total_chaos';

/**
 * Real-world cooking outcome proof attached to an experiment branch
 */
export interface CookingResult extends Timestamped {
  readonly id: EntityId;
  readonly experimentId: EntityId;
  readonly userId: EntityId;
  readonly media: readonly MediaReference[];
  readonly caption?: string;
  readonly notes?: string;
  readonly outcomeTag: CookingOutcomeTag;
  readonly tasteRating: number; // 1-5 scale
  readonly textureRating?: number; // 1-5 scale
  readonly wouldMakeAgain: boolean;
  readonly likesCount: number;
}

/**
 * Community reaction attached to a cooking result
 */
export interface CookingResultReaction extends Timestamped {
  readonly id: EntityId;
  readonly userId: EntityId;
  readonly resultId: EntityId;
  readonly type: ResultReactionType;
}

/**
 * Aggregate reactions summary for a cooking result
 */
export interface ResultReactionSummary {
  readonly resultId: EntityId;
  readonly fireCount: number;
  readonly yuckCount: number;
  readonly respectCount: number;
  readonly laughCount: number;
  readonly mindBlownCount: number;
  readonly totalReactions: number;
  readonly likesCount: number;
  readonly userReaction?: ResultReactionType;
}
