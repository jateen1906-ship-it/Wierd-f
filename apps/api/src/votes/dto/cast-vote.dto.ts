import { z } from 'zod';
import { voteChoiceSchema } from '@food-evolution/validation';

/**
 * Validation schema for casting or updating a vote on an experiment.
 * Accepts only 'would_try' or 'pass'.
 */
export const castVoteSchema = z.object({
  choice: voteChoiceSchema,
});

export type CastVoteDto = z.infer<typeof castVoteSchema>;
