import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import type { CreateCookingResultDto } from './dto/create-cooking-result.dto';
import type { CookingResultQueryDto } from './dto/cooking-result-query.dto';
import {
  toCookingResultResponse,
  type CookingResultResponse,
  type PaginatedCookingResultsResponse,
} from './dto/cooking-result-response.dto';

const SAFE_USER_SELECT = {
  id: true,
  username: true,
  displayName: true,
  avatarUrl: true,
  skillLevel: true,
};

@Injectable()
export class CookingResultsService {
  private readonly logger = new Logger(CookingResultsService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Create a new real-world cooking result attached to an experiment branch
   */
  async create(userId: string, dto: CreateCookingResultDto): Promise<CookingResultResponse> {
    // 1. Verify that the referenced experiment exists and is safe
    const experiment = await this.prisma.experiment.findUnique({
      where: { id: dto.experimentId },
      select: { id: true, safetyStatus: true },
    });

    if (!experiment || experiment.safetyStatus === 'BLOCKED') {
      throw new NotFoundException(`Experiment with ID ${dto.experimentId} does not exist`);
    }

    // 2. Persist cooking result and update experiment aggregate counts in a transaction
    const created = await this.prisma.$transaction(async (tx) => {
      const result = await tx.cookingResult.create({
        data: {
          experimentId: dto.experimentId,
          userId,
          media: dto.media as any,
          caption: dto.caption?.trim() || null,
          notes: dto.notes?.trim() || null,
          outcomeTag: dto.outcomeTag,
          tasteRating: dto.tasteRating,
          textureRating: dto.textureRating ?? null,
          wouldMakeAgain: dto.wouldMakeAgain,
          modificationsMade: dto.modificationsMade?.trim() || null,
          likesCount: 0,
        },
        include: {
          user: {
            select: SAFE_USER_SELECT,
          },
        },
      });

      // Increment experiment's resultCount and cookCount
      await tx.experiment.update({
        where: { id: dto.experimentId },
        data: {
          resultCount: { increment: 1 },
          cookCount: { increment: 1 },
        },
      });

      return result;
    });

    this.logger.log(
      `CookingResult created: ${created.id} by user ${userId} for experiment ${dto.experimentId}`,
    );
    return toCookingResultResponse(created);
  }

  /**
   * Retrieve a single cooking result by its unique identifier
   */
  async findOne(id: string): Promise<CookingResultResponse> {
    const result = await this.prisma.cookingResult.findUnique({
      where: { id },
      include: {
        user: {
          select: SAFE_USER_SELECT,
        },
        experiment: {
          select: {
            safetyStatus: true,
          },
        },
      },
    });

    if (!result || result.experiment?.safetyStatus === 'BLOCKED') {
      throw new NotFoundException(`Cooking result with ID ${id} not found`);
    }

    return toCookingResultResponse(result);
  }

  /**
   * List cooking results for a specific experiment with pagination and stable ordering
   */
  async findByExperiment(
    experimentId: string,
    query: CookingResultQueryDto,
  ): Promise<PaginatedCookingResultsResponse> {
    // 1. Verify experiment exists and is safe
    const experiment = await this.prisma.experiment.findUnique({
      where: { id: experimentId },
      select: { id: true, safetyStatus: true },
    });

    if (!experiment || experiment.safetyStatus === 'BLOCKED') {
      throw new NotFoundException(`Experiment with ID ${experimentId} not found`);
    }

    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      this.prisma.cookingResult.findMany({
        where: { experimentId },
        include: {
          user: {
            select: SAFE_USER_SELECT,
          },
        },
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        skip,
        take: limit,
      }),
      this.prisma.cookingResult.count({
        where: { experimentId },
      }),
    ]);

    const totalPages = Math.ceil(total / limit) || (total === 0 ? 0 : 1);
    const hasMore = page < totalPages;

    return {
      items: items.map(toCookingResultResponse),
      total,
      page,
      limit,
      totalPages,
      hasMore,
    };
  }

  /**
   * List cooking results created by a specific user with pagination and stable ordering
   */
  async findByUser(
    userId: string,
    query: CookingResultQueryDto,
  ): Promise<PaginatedCookingResultsResponse> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const where = {
      userId,
      experiment: { safetyStatus: { not: 'BLOCKED' } },
    };

    const [items, total] = await Promise.all([
      this.prisma.cookingResult.findMany({
        where,
        include: {
          user: {
            select: SAFE_USER_SELECT,
          },
        },
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        skip,
        take: limit,
      }),
      this.prisma.cookingResult.count({
        where,
      }),
    ]);

    const totalPages = Math.ceil(total / limit) || (total === 0 ? 0 : 1);
    const hasMore = page < totalPages;

    return {
      items: items.map(toCookingResultResponse),
      total,
      page,
      limit,
      totalPages,
      hasMore,
    };
  }

  /**
   * General list of cooking results with optional filters
   */
  async findAll(query: CookingResultQueryDto): Promise<PaginatedCookingResultsResponse> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const where: any = {
      experiment: { safetyStatus: { not: 'BLOCKED' } },
    };
    if (query.experimentId) {
      where.experimentId = query.experimentId;
    }

    const [items, total] = await Promise.all([
      this.prisma.cookingResult.findMany({
        where,
        include: {
          user: {
            select: SAFE_USER_SELECT,
          },
        },
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        skip,
        take: limit,
      }),
      this.prisma.cookingResult.count({
        where,
      }),
    ]);

    const totalPages = Math.ceil(total / limit) || (total === 0 ? 0 : 1);
    const hasMore = page < totalPages;

    return {
      items: items.map(toCookingResultResponse),
      total,
      page,
      limit,
      totalPages,
      hasMore,
    };
  }
}
