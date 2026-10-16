import type { EntityId, Timestamped } from './common.js';

/**
 * MVP core vote choices for experiment validation
 */
export type VoteChoice = 'would_try' | 'pass';

/**
 * Extended reaction types for results
 */
export type ResultReactionType = 'fire' | 'yuck' | 'respect' | 'laugh' | 'mind_blown';

/**
 * Vote cast by a user on an experiment
 */
export interface ExperimentVote extends Timestamped {
  readonly id: EntityId;
  readonly userId: EntityId;
  readonly experimentId: EntityId;
  readonly choice: VoteChoice;
}

/**
 * Aggregate vote counts for an experiment
 */
export interface ExperimentVoteSummary {
  readonly experimentId: EntityId;
  readonly wouldTryCount: number;
  readonly passCount: number;
  readonly totalVotes: number;
  readonly userVote?: VoteChoice;
}
