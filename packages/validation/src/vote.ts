import { z } from 'zod';
import type {
  ExperimentVote,
  ExperimentVoteSummary,
  ResultReactionType,
  VoteChoice,
} from '@food-evolution/types';
import { entityIdSchema, isoTimestampSchema } from './common.js';

/**
 * MVP core vote choices schema
 */
export const voteChoiceSchema = z.enum(['would_try', 'pass']) satisfies z.ZodType<VoteChoice>;

/**
 * Result reaction type schema
 */
export const resultReactionTypeSchema = z.enum([
  'fire',
  'yuck',
  'respect',
  'laugh',
  'mind_blown',
]) satisfies z.ZodType<ResultReactionType>;

/**
 * Cast vote request schema
 */
export const castVoteInputSchema = z.object({
  experimentId: entityIdSchema,
  choice: voteChoiceSchema,
});

/**
 * Full ExperimentVote entity schema
 */
export const experimentVoteSchema = z.object({
  id: entityIdSchema,
  userId: entityIdSchema,
  experimentId: entityIdSchema,
  choice: voteChoiceSchema,
  createdAt: isoTimestampSchema,
  updatedAt: isoTimestampSchema.optional(),
}) satisfies z.ZodType<ExperimentVote>;

/**
 * Experiment vote summary schema
 */
export const experimentVoteSummarySchema = z.object({
  experimentId: entityIdSchema,
  wouldTryCount: z.number().int().nonnegative(),
  passCount: z.number().int().nonnegative(),
  totalVotes: z.number().int().nonnegative(),
  userVote: voteChoiceSchema.optional(),
}) satisfies z.ZodType<ExperimentVoteSummary>;
