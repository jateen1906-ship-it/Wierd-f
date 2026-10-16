import type { EntityId, IsoTimestamp, Timestamped } from './common.js';

/**
 * Safety classification status
 */
export type SafetyStatus = 'SAFE' | 'WARNING' | 'BLOCKED' | 'REVIEW';

/**
 * Risk category flags for food experiments
 */
export type SafetyRiskCategory =
  | 'chemical_hazard'
  | 'toxic_substance'
  | 'unsafe_temperature'
  | 'undercooked_pathogen'
  | 'choking_hazard'
  | 'extreme_challenge'
  | 'dangerous_technique'
  | 'allergen_risk'
  | 'non_edible_item'
  | 'none';

/**
 * Evaluator mechanism that produced the decision
 */
export type SafetyEvaluatorType = 'rule_engine' | 'ai_guard' | 'human_moderator';

/**
 * Result of an automated or manual safety evaluation
 */
export interface SafetyDecision extends Timestamped {
  readonly id: EntityId;
  readonly targetId: EntityId;
  readonly targetType: 'experiment' | 'result' | 'comment' | 'challenge_submission';
  readonly status: SafetyStatus;
  readonly riskCategory: SafetyRiskCategory;
  readonly reason: string;
  readonly evaluatedAt: IsoTimestamp;
  readonly evaluatorType: SafetyEvaluatorType;
  readonly modelVersion?: string;
  readonly reviewerNotes?: string;
}
