import type { ResultReaction, CookingResult } from '@prisma/client';
import type { ResultReactionType, ResultReactionSummary } from '@food-evolution/types';

/**
 * Standard single reaction response representation
 */
export interface CookingResultReactionResponse {
  id: string;
  userId: string;
  resultId: string;
  type: ResultReactionType;
  createdAt: string;
  updatedAt: string;
}

/**
 * Aggregate summary of reactions on a cooking result
 */
export type CookingResultReactionSummaryResponse = ResultReactionSummary;

/**
 * User reaction history item with minimal attached cooking-result metadata
 */
export interface UserReactionItemResponse extends CookingResultReactionResponse {
  result?: {
    id: string;
    experimentId: string;
    outcomeTag: string;
    caption?: string | null;
  };
}

/**
 * Standard paginated response envelope for user reaction history
 */
export interface PaginatedUserReactionsResponse {
  items: UserReactionItemResponse[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasMore: boolean;
}

/**
 * Maps raw database ResultReaction to sanitized response DTO
 */
export function toReactionResponse(reaction: ResultReaction): CookingResultReactionResponse {
  return {
    id: reaction.id,
    userId: reaction.userId,
    resultId: reaction.resultId,
    type: reaction.type as ResultReactionType,
    createdAt: reaction.createdAt.toISOString(),
    updatedAt: reaction.updatedAt.toISOString(),
  };
}

/**
 * Maps database ResultReaction with included CookingResult to UserReactionItemResponse
 */
export function toUserReactionItemResponse(
  reaction: ResultReaction & {
    result?: Pick<CookingResult, 'id' | 'experimentId' | 'outcomeTag' | 'caption'> | null;
  },
): UserReactionItemResponse {
  return {
    id: reaction.id,
    userId: reaction.userId,
    resultId: reaction.resultId,
    type: reaction.type as ResultReactionType,
    createdAt: reaction.createdAt.toISOString(),
    updatedAt: reaction.updatedAt.toISOString(),
    result: reaction.result
      ? {
          id: reaction.result.id,
          experimentId: reaction.result.experimentId,
          outcomeTag: reaction.result.outcomeTag,
          caption: reaction.result.caption,
        }
      : undefined,
  };
}
