import { z } from 'zod';
import { resultReactionTypeSchema } from '@food-evolution/validation';
import type { ResultReactionType } from '@food-evolution/types';

/**
 * Zod validation schema for submitting or updating a cooking result reaction.
 * Accepts either `type` or `choice` for maximum client compatibility.
 */
export const castReactionSchema = z
  .object({
    type: resultReactionTypeSchema.optional(),
    choice: resultReactionTypeSchema.optional(),
  })
  .refine((data) => data.type !== undefined || data.choice !== undefined, {
    message: 'Reaction type or choice is required',
  });

export type CastReactionDto = z.infer<typeof castReactionSchema>;

export function extractReactionType(dto: CastReactionDto): ResultReactionType {
  const type = dto.type ?? dto.choice;
  if (!type) {
    throw new Error('Reaction type or choice must be provided');
  }
  return type;
}
