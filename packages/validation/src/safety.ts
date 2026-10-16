import { z } from 'zod';
import type {
  SafetyDecision,
  SafetyEvaluatorType,
  SafetyRiskCategory,
  SafetyStatus,
} from '@food-evolution/types';
import { entityIdSchema, isoTimestampSchema } from './common.js';

/**
 * Safety status schema
 */
export const safetyStatusSchema = z.enum([
  'SAFE',
  'WARNING',
  'BLOCKED',
  'REVIEW',
]) satisfies z.ZodType<SafetyStatus>;

/**
 * Safety risk category schema
 */
export const safetyRiskCategorySchema = z.enum([
  'chemical_hazard',
  'toxic_substance',
  'unsafe_temperature',
  'undercooked_pathogen',
  'choking_hazard',
  'extreme_challenge',
  'dangerous_technique',
  'allergen_risk',
  'non_edible_item',
  'none',
]) satisfies z.ZodType<SafetyRiskCategory>;

/**
 * Safety evaluator type schema
 */
export const safetyEvaluatorTypeSchema = z.enum([
  'rule_engine',
  'ai_guard',
  'human_moderator',
]) satisfies z.ZodType<SafetyEvaluatorType>;

/**
 * Safety Decision record validation schema
 */
export const safetyDecisionSchema = z.object({
  id: entityIdSchema,
  targetId: entityIdSchema,
  targetType: z.enum(['experiment', 'result', 'comment', 'challenge_submission']),
  status: safetyStatusSchema,
  riskCategory: safetyRiskCategorySchema,
  reason: z
    .string()
    .trim()
    .min(1, 'Safety reason cannot be empty')
    .max(1000, 'Reason cannot exceed 1000 characters'),
  evaluatedAt: isoTimestampSchema,
  evaluatorType: safetyEvaluatorTypeSchema,
  modelVersion: z.string().trim().max(50).optional(),
  reviewerNotes: z.string().trim().max(1000).optional(),
  createdAt: isoTimestampSchema,
  updatedAt: isoTimestampSchema.optional(),
}) satisfies z.ZodType<SafetyDecision>;
