import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import type { VoteChoice } from '@food-evolution/types';
import type { UserVotesQueryDto } from './dto/user-votes-query.dto';
import {
  toVoteResponse,
  toUserVoteItemResponse,
  type VoteResponse,
  type ExperimentVoteSummaryResponse,
  type PaginatedUserVotesResponse,
} from './dto/vote-response.dto';

@Injectable()
export class VotesService {
  private readonly logger = new Logger(VotesService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Cast a new vote or update an existing vote for an experiment.
   * Atomically synchronizes Experiment.voteCount:
   * - Increments voteCount only when creating a new vote.
   * - Preserves voteCount without double-counting on vote updates.
   * - Safe against concurrency races with Prisma unique constraint retry handling.
   */
  async castVote(
    userId: string,
    experimentId: string,
    choice: VoteChoice,
  ): Promise<{ vote: VoteResponse; isNew: boolean }> {
    try {
      return await this.prisma.$transaction(async (tx) => {
        // 1. Verify experiment exists
        const experiment = await tx.experiment.findUnique({
          where: { id: experimentId },
          select: { id: true },
        });

        if (!experiment) {
          throw new NotFoundException(`Experiment with ID ${experimentId} not found`);
        }

        // 2. Check for existing vote by this user on this experiment
        const existingVote = await tx.vote.findUnique({
          where: {
            unique_user_experiment_vote: {
              userId,
              experimentId,
            },
          },
        });

        // 3. Update existing vote if present
        if (existingVote) {
          if (existingVote.choice === choice) {
            return { vote: toVoteResponse(existingVote), isNew: false };
          }

          const updatedVote = await tx.vote.update({
            where: { id: existingVote.id },
            data: { choice },
          });

          this.logger.log(
            `Vote updated: user ${userId} changed vote on experiment ${experimentId} to ${choice}`,
          );
          return { vote: toVoteResponse(updatedVote), isNew: false };
        }

        // 4. Create new vote and increment experiment voteCount
        const newVote = await tx.vote.create({
          data: {
            userId,
            experimentId,
            choice,
          },
        });

        await tx.experiment.update({
          where: { id: experimentId },
          data: {
            voteCount: { increment: 1 },
          },
        });

        this.logger.log(
          `Vote created: user ${userId} voted ${choice} on experiment ${experimentId}`,
        );
        return { vote: toVoteResponse(newVote), isNew: true };
      });
    } catch (error: any) {
      // Handle rare concurrent insert race condition (P2002: unique constraint violated)
      if (error?.code === 'P2002') {
        this.logger.warn(
          `Concurrent vote race detected for user ${userId} on experiment ${experimentId}. Retrying as update.`,
        );
        return this.castVote(userId, experimentId, choice);
      }
      throw error;
    }
  }

  /**
   * Retrieve aggregate vote summary for an experiment.
   * Validates experiment existence and returns wouldTryCount, passCount, totalVotes.
   * If caller is authenticated (userId provided), includes userVote if cast.
   */
  async getVoteSummary(
    experimentId: string,
    userId?: string,
  ): Promise<ExperimentVoteSummaryResponse> {
    // 1. Validate experiment existence
    const experiment = await this.prisma.experiment.findUnique({
      where: { id: experimentId },
      select: { id: true },
    });

    if (!experiment) {
      throw new NotFoundException(`Experiment with ID ${experimentId} not found`);
    }

    // 2. Aggregate counts
    const [wouldTryCount, passCount] = await Promise.all([
      this.prisma.vote.count({
        where: { experimentId, choice: 'would_try' },
      }),
      this.prisma.vote.count({
        where: { experimentId, choice: 'pass' },
      }),
    ]);

    const totalVotes = wouldTryCount + passCount;

    // 3. Check caller's vote if authenticated
    let userVote: VoteChoice | undefined = undefined;
    if (userId) {
      const vote = await this.prisma.vote.findUnique({
        where: {
          unique_user_experiment_vote: {
            userId,
            experimentId,
          },
        },
        select: { choice: true },
      });

      if (vote) {
        userVote = vote.choice as VoteChoice;
      }
    }

    return {
      experimentId,
      wouldTryCount,
      passCount,
      totalVotes,
      ...(userVote ? { userVote } : {}),
    };
  }

  /**
   * Delete authenticated user's vote on an experiment.
   * Decrements Experiment.voteCount only when a vote actually existed.
   */
  async deleteVote(
    userId: string,
    experimentId: string,
  ): Promise<{ success: boolean; message: string }> {
    return this.prisma.$transaction(async (tx) => {
      // 1. Validate experiment existence
      const experiment = await tx.experiment.findUnique({
        where: { id: experimentId },
        select: { id: true },
      });

      if (!experiment) {
        throw new NotFoundException(`Experiment with ID ${experimentId} not found`);
      }

      // 2. Validate vote existence
      const existingVote = await tx.vote.findUnique({
        where: {
          unique_user_experiment_vote: {
            userId,
            experimentId,
          },
        },
      });

      if (!existingVote) {
        throw new NotFoundException(`Vote not found for experiment ${experimentId}`);
      }

      // 3. Delete vote
      await tx.vote.delete({
        where: { id: existingVote.id },
      });

      // 4. Decrement experiment voteCount
      await tx.experiment.update({
        where: { id: experimentId },
        data: {
          voteCount: { decrement: 1 },
        },
      });

      this.logger.log(`Vote deleted: user ${userId} removed vote on experiment ${experimentId}`);

      return {
        success: true,
        message: 'Vote deleted successfully',
      };
    });
  }

  /**
   * Retrieve the authenticated user's voting history with pagination.
   * Never accepts client-supplied userId.
   */
  async getUserVotes(
    userId: string,
    query: UserVotesQueryDto,
  ): Promise<PaginatedUserVotesResponse> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      this.prisma.vote.findMany({
        where: { userId },
        include: {
          experiment: {
            select: {
              id: true,
              title: true,
            },
          },
        },
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        skip,
        take: limit,
      }),
      this.prisma.vote.count({
        where: { userId },
      }),
    ]);

    const totalPages = Math.ceil(total / limit) || (total === 0 ? 0 : 1);
    const hasMore = page < totalPages;

    return {
      items: items.map(toUserVoteItemResponse),
      total,
      page,
      limit,
      totalPages,
      hasMore,
    };
  }
}
