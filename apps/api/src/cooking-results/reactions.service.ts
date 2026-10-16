import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import type { ResultReactionType } from '@food-evolution/types';
import type { UserReactionsQueryDto } from './dto/user-reactions-query.dto';
import {
  toReactionResponse,
  toUserReactionItemResponse,
  type CookingResultReactionResponse,
  type CookingResultReactionSummaryResponse,
  type PaginatedUserReactionsResponse,
} from './dto/reaction-response.dto';

@Injectable()
export class ReactionsService {
  private readonly logger = new Logger(ReactionsService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Cast a new reaction or update an existing reaction on a cooking result.
   * Atomically maintains CookingResult.likesCount:
   * - Increments likesCount only upon new reaction creation.
   * - Preserves likesCount without double-counting on reaction type updates.
   * - Safe against concurrency races with Prisma unique constraint retry handling.
   */
  async castReaction(
    userId: string,
    resultId: string,
    type: ResultReactionType,
  ): Promise<{ reaction: CookingResultReactionResponse; isNew: boolean }> {
    try {
      return await this.prisma.$transaction(async (tx) => {
        // 1. Verify cooking result exists
        const result = await tx.cookingResult.findUnique({
          where: { id: resultId },
          select: { id: true },
        });

        if (!result) {
          throw new NotFoundException(`Cooking result with ID ${resultId} not found`);
        }

        // 2. Check for existing reaction by this user on this cooking result
        const existingReaction = await tx.resultReaction.findUnique({
          where: {
            unique_user_result_reaction: {
              userId,
              resultId,
            },
          },
        });

        // 3. Update existing reaction if present
        if (existingReaction) {
          if (existingReaction.type === type) {
            return { reaction: toReactionResponse(existingReaction), isNew: false };
          }

          const updated = await tx.resultReaction.update({
            where: { id: existingReaction.id },
            data: { type },
          });

          this.logger.log(
            `Reaction updated: user ${userId} changed reaction on result ${resultId} to ${type}`,
          );
          return { reaction: toReactionResponse(updated), isNew: false };
        }

        // 4. Create new reaction and increment cookingResult likesCount
        const created = await tx.resultReaction.create({
          data: {
            userId,
            resultId,
            type,
          },
        });

        await tx.cookingResult.update({
          where: { id: resultId },
          data: {
            likesCount: { increment: 1 },
          },
        });

        this.logger.log(
          `Reaction created: user ${userId} reacted with ${type} on result ${resultId}`,
        );
        return { reaction: toReactionResponse(created), isNew: true };
      });
    } catch (error: any) {
      // Handle concurrent insert race condition (P2002: unique constraint violated)
      if (error?.code === 'P2002') {
        this.logger.warn(
          `Concurrent reaction race detected for user ${userId} on result ${resultId}. Retrying as update.`,
        );
        return this.castReaction(userId, resultId, type);
      }
      throw error;
    }
  }

  /**
   * Retrieve aggregate reaction summary for a cooking result.
   * Validates cooking result existence and returns all five reaction counts, totalReactions, and likesCount.
   * If caller is authenticated (userId provided), includes userReaction if reacted.
   */
  async getReactionSummary(
    resultId: string,
    userId?: string,
  ): Promise<CookingResultReactionSummaryResponse> {
    // 1. Validate cooking result existence and get current likesCount
    const result = await this.prisma.cookingResult.findUnique({
      where: { id: resultId },
      select: { id: true, likesCount: true },
    });

    if (!result) {
      throw new NotFoundException(`Cooking result with ID ${resultId} not found`);
    }

    // 2. Count each of the five reaction types
    const [fireCount, yuckCount, respectCount, laughCount, mindBlownCount] = await Promise.all([
      this.prisma.resultReaction.count({ where: { resultId, type: 'fire' } }),
      this.prisma.resultReaction.count({ where: { resultId, type: 'yuck' } }),
      this.prisma.resultReaction.count({ where: { resultId, type: 'respect' } }),
      this.prisma.resultReaction.count({ where: { resultId, type: 'laugh' } }),
      this.prisma.resultReaction.count({ where: { resultId, type: 'mind_blown' } }),
    ]);

    const totalReactions = fireCount + yuckCount + respectCount + laughCount + mindBlownCount;

    // 3. Check caller's reaction if authenticated
    let userReaction: ResultReactionType | undefined = undefined;
    if (userId) {
      const userRecord = await this.prisma.resultReaction.findUnique({
        where: {
          unique_user_result_reaction: {
            userId,
            resultId,
          },
        },
        select: { type: true },
      });

      if (userRecord) {
        userReaction = userRecord.type as ResultReactionType;
      }
    }

    return {
      resultId,
      fireCount,
      yuckCount,
      respectCount,
      laughCount,
      mindBlownCount,
      totalReactions,
      likesCount: result.likesCount,
      ...(userReaction ? { userReaction } : {}),
    };
  }

  /**
   * Delete authenticated user's reaction on a cooking result.
   * Decrements CookingResult.likesCount only when a reaction actually existed.
   */
  async deleteReaction(
    userId: string,
    resultId: string,
  ): Promise<{ success: boolean; message: string }> {
    return this.prisma.$transaction(async (tx) => {
      // 1. Validate cooking result existence
      const result = await tx.cookingResult.findUnique({
        where: { id: resultId },
        select: { id: true },
      });

      if (!result) {
        throw new NotFoundException(`Cooking result with ID ${resultId} not found`);
      }

      // 2. Validate reaction existence
      const existingReaction = await tx.resultReaction.findUnique({
        where: {
          unique_user_result_reaction: {
            userId,
            resultId,
          },
        },
      });

      if (!existingReaction) {
        throw new NotFoundException(`Reaction not found for cooking result ${resultId}`);
      }

      // 3. Delete reaction
      await tx.resultReaction.delete({
        where: { id: existingReaction.id },
      });

      // 4. Decrement cookingResult likesCount
      await tx.cookingResult.update({
        where: { id: resultId },
        data: {
          likesCount: { decrement: 1 },
        },
      });

      this.logger.log(`Reaction deleted: user ${userId} removed reaction on result ${resultId}`);

      return {
        success: true,
        message: 'Reaction deleted successfully',
      };
    });
  }

  /**
   * Retrieve the authenticated user's reaction history with pagination.
   * Strictly isolated to the authenticated caller's userId.
   */
  async getUserReactions(
    userId: string,
    query: UserReactionsQueryDto,
  ): Promise<PaginatedUserReactionsResponse> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      this.prisma.resultReaction.findMany({
        where: { userId },
        include: {
          result: {
            select: {
              id: true,
              experimentId: true,
              outcomeTag: true,
              caption: true,
            },
          },
        },
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        skip,
        take: limit,
      }),
      this.prisma.resultReaction.count({
        where: { userId },
      }),
    ]);

    const totalPages = Math.ceil(total / limit) || (total === 0 ? 0 : 1);
    const hasMore = page < totalPages;

    return {
      items: items.map(toUserReactionItemResponse),
      total,
      page,
      limit,
      totalPages,
      hasMore,
    };
  }
}
