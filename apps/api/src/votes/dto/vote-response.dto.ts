import type { Vote, Experiment } from '@prisma/client';
import type { VoteChoice, ExperimentVoteSummary } from '@food-evolution/types';

/**
 * Standard Vote response representation
 */
export interface VoteResponse {
  id: string;
  userId: string;
  experimentId: string;
  choice: VoteChoice;
  createdAt: string;
  updatedAt: string;
}

/**
 * Aggregate vote counts for an experiment, including authenticated user's choice if present
 */
export type ExperimentVoteSummaryResponse = ExperimentVoteSummary;

/**
 * Single vote item in the user's vote history, including minimal experiment details
 */
export interface UserVoteItemResponse extends VoteResponse {
  experiment?: {
    id: string;
    title: string;
  };
}

/**
 * Standard paginated response envelope for user voting history
 */
export interface PaginatedUserVotesResponse {
  items: UserVoteItemResponse[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasMore: boolean;
}

/**
 * Maps database Vote model to VoteResponse DTO
 */
export function toVoteResponse(vote: Vote): VoteResponse {
  return {
    id: vote.id,
    userId: vote.userId,
    experimentId: vote.experimentId,
    choice: vote.choice as VoteChoice,
    createdAt: vote.createdAt.toISOString(),
    updatedAt: vote.updatedAt.toISOString(),
  };
}

/**
 * Maps database Vote model with relation to UserVoteItemResponse
 */
export function toUserVoteItemResponse(
  vote: Vote & {
    experiment?: Pick<Experiment, 'id' | 'title'> | null;
  },
): UserVoteItemResponse {
  return {
    id: vote.id,
    userId: vote.userId,
    experimentId: vote.experimentId,
    choice: vote.choice as VoteChoice,
    createdAt: vote.createdAt.toISOString(),
    updatedAt: vote.updatedAt.toISOString(),
    experiment: vote.experiment
      ? {
          id: vote.experiment.id,
          title: vote.experiment.title,
        }
      : undefined,
  };
}
