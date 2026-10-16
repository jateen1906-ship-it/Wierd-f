import type { EntityId, MediaReference, Timestamped } from './common.js';

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
  readonly modificationsMade?: string;
  readonly likesCount: number;
}
