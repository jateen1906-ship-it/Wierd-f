import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { PrismaService } from '../database/prisma.service';
import type { CreateExperimentDto } from './dto/create-experiment.dto';
import type { RemixExperimentDto } from './dto/remix-experiment.dto';
import {
  toExperimentResponse,
  toSafeCreator,
  type ExperimentResponse,
  type PaginatedExperimentsResponse,
} from './dto/experiment-response.dto';
import type { LineageNode, LineageResponse } from './dto/lineage-response.dto';
import type { ExperimentTreeNode, ExperimentTreeResponse } from './dto/tree-response.dto';
import type {
  ExperimentQueryDto,
  ExperimentSort,
  UserExperimentsQueryDto,
} from './dto/experiment-query.dto';

const SAFE_CREATOR_SELECT = {
  id: true,
  username: true,
  displayName: true,
  avatarUrl: true,
  skillLevel: true,
};

@Injectable()
export class ExperimentsService {
  private readonly logger = new Logger(ExperimentsService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Create a new root food experiment
   *
   * Root node rules:
   * - parentId = null
   * - rootId = experiment's own ID
   * - branchDepth = 0
   * - creatorId = authenticated user
   */
  async create(creatorId: string, dto: CreateExperimentDto): Promise<ExperimentResponse> {
    const experimentId = randomUUID();

    // Verify canonical ingredients if referenced
    await this.validateCanonicalIngredients(dto.ingredients);

    const created = await this.prisma.$transaction(async (tx) => {
      // 1. Create root experiment node
      await tx.experiment.create({
        data: {
          id: experimentId,
          creatorId,
          parentId: null,
          rootId: experimentId,
          branchDepth: 0,
          title: dto.title.trim(),
          description: dto.description.trim(),
          steps: dto.steps as any,
          difficulty: dto.difficulty,
          estimatedCost: dto.estimatedCost as any,
          estimatedTimeMinutes: dto.estimatedTimeMinutes,
          heroMedia: (dto.heroMedia ?? undefined) as any,
          transformations: undefined,
          safetyStatus: 'SAFE',
        },
      });

      // 2. Create normalized ingredients
      if (dto.ingredients && dto.ingredients.length > 0) {
        await tx.experimentIngredient.createMany({
          data: dto.ingredients.map((ing) => ({
            experimentId,
            canonicalId: ing.canonicalId ?? null,
            name: ing.name.trim(),
            quantity: ing.quantity,
            unit: ing.unit.trim(),
            preparation: ing.preparation?.trim() ?? null,
            isOptional: Boolean(ing.isOptional),
            isCustomAddition: Boolean(ing.isCustomAddition),
          })),
        });
      }

      // 3. Return created record with relations
      return tx.experiment.findUnique({
        where: { id: experimentId },
        include: {
          creator: true,
          ingredients: true,
        },
      });
    });

    if (!created) {
      throw new BadRequestException('Failed to create root experiment');
    }

    this.logger.log(
      `Created root experiment "${created.title}" [${created.id}] by user [${creatorId}]`,
    );
    return toExperimentResponse(created);
  }

  /**
   * Fetch single experiment details with creator, ingredients, and lineage metadata
   */
  async findOne(id: string): Promise<ExperimentResponse> {
    const experiment = await this.prisma.experiment.findUnique({
      where: { id },
      include: {
        creator: true,
        ingredients: true,
      },
    });

    if (!experiment) {
      throw new NotFoundException(`Experiment with ID "${id}" was not found`);
    }

    return toExperimentResponse(experiment);
  }

  /**
   * Remix / Branch an existing experiment
   *
   * Remix lineage rules:
   * - parentId = original experiment ID
   * - rootId = original experiment's rootId (or original's id if root was self)
   * - branchDepth = original experiment's branchDepth + 1
   * - creatorId = authenticated user
   * - Original experiment is NEVER mutated (remixCount incremented atomically)
   */
  async remix(
    parentId: string,
    creatorId: string,
    dto: RemixExperimentDto,
  ): Promise<ExperimentResponse> {
    // Verify canonical ingredients if referenced
    await this.validateCanonicalIngredients(dto.ingredients);

    const remixId = randomUUID();

    const createdRemix = await this.prisma.$transaction(async (tx) => {
      // 1. Look up parent experiment
      const parent = await tx.experiment.findUnique({
        where: { id: parentId },
      });

      if (!parent) {
        throw new NotFoundException(`Parent experiment with ID "${parentId}" was not found`);
      }

      const rootId = parent.rootId ?? parent.id;
      const branchDepth = parent.branchDepth + 1;

      // 2. Atomically increment parent remixCount
      await tx.experiment.update({
        where: { id: parentId },
        data: { remixCount: { increment: 1 } },
      });

      // 3. Create new branch experiment node
      await tx.experiment.create({
        data: {
          id: remixId,
          creatorId,
          parentId: parent.id,
          rootId,
          branchDepth,
          title: dto.title.trim(),
          description: dto.description.trim(),
          steps: (dto.steps ?? parent.steps) as any,
          difficulty: dto.difficulty ?? parent.difficulty,
          estimatedCost: (dto.estimatedCost ?? parent.estimatedCost) as any,
          estimatedTimeMinutes: dto.estimatedTimeMinutes ?? parent.estimatedTimeMinutes,
          heroMedia: (dto.heroMedia ?? null) as any,
          transformations: dto.transformations as any,
          safetyStatus: 'SAFE',
        },
      });

      // 4. Create normalized ingredients for the new branch
      if (dto.ingredients && dto.ingredients.length > 0) {
        await tx.experimentIngredient.createMany({
          data: dto.ingredients.map((ing) => ({
            experimentId: remixId,
            canonicalId: ing.canonicalId ?? null,
            name: ing.name.trim(),
            quantity: ing.quantity,
            unit: ing.unit.trim(),
            preparation: ing.preparation?.trim() ?? null,
            isOptional: Boolean(ing.isOptional),
            isCustomAddition: Boolean(ing.isCustomAddition),
          })),
        });
      }

      // 5. Return complete newly created remix node
      return tx.experiment.findUnique({
        where: { id: remixId },
        include: {
          creator: true,
          ingredients: true,
        },
      });
    });

    if (!createdRemix) {
      throw new BadRequestException('Failed to create remix branch');
    }

    this.logger.log(
      `Remixed experiment [${parentId}] -> [${createdRemix.id}] (depth: ${createdRemix.branchDepth}, root: ${createdRemix.rootId}) by user [${creatorId}]`,
    );
    return toExperimentResponse(createdRemix);
  }

  /**
   * Get ancestor chain for an experiment
   * Traverses backwards from experiment -> parent -> ... -> root
   */
  async getLineage(id: string): Promise<LineageResponse> {
    const current = await this.prisma.experiment.findUnique({
      where: { id },
      include: { creator: true },
    });

    if (!current) {
      throw new NotFoundException(`Experiment with ID "${id}" was not found`);
    }

    const currentNode: LineageNode = {
      id: current.id,
      title: current.title,
      creator: toSafeCreator(current.creator),
      parentId: current.parentId,
      rootId: current.rootId,
      branchDepth: current.branchDepth,
      createdAt: current.createdAt.toISOString(),
      remixCount: current.remixCount,
    };

    const ancestors: LineageNode[] = [];
    let currentParentId = current.parentId;

    while (currentParentId) {
      const parent = await this.prisma.experiment.findUnique({
        where: { id: currentParentId },
        include: { creator: true },
      });

      if (!parent) break;

      ancestors.push({
        id: parent.id,
        title: parent.title,
        creator: toSafeCreator(parent.creator),
        parentId: parent.parentId,
        rootId: parent.rootId,
        branchDepth: parent.branchDepth,
        createdAt: parent.createdAt.toISOString(),
        remixCount: parent.remixCount,
      });

      currentParentId = parent.parentId;
    }

    const chain = [currentNode, ...ancestors];

    return {
      experimentId: id,
      ancestors,
      chain,
      chainLength: chain.length,
    };
  }

  /**
   * Get complete graph / branch tree for the experiment family
   */
  async getTree(id: string): Promise<ExperimentTreeResponse> {
    const target = await this.prisma.experiment.findUnique({
      where: { id },
    });

    if (!target) {
      throw new NotFoundException(`Experiment with ID "${id}" was not found`);
    }

    const targetRootId = target.rootId ?? target.id;

    // Fetch all nodes belonging to this evolution family
    const family = await this.prisma.experiment.findMany({
      where: {
        OR: [{ rootId: targetRootId }, { id: targetRootId }],
      },
      include: { creator: true },
      orderBy: [{ branchDepth: 'asc' }, { createdAt: 'asc' }],
    });

    // Build node map for tree construction
    const nodeMap = new Map<string, ExperimentTreeNode>();
    for (const exp of family) {
      nodeMap.set(exp.id, {
        id: exp.id,
        title: exp.title,
        creator: toSafeCreator(exp.creator),
        parentId: exp.parentId,
        rootId: exp.rootId,
        branchDepth: exp.branchDepth,
        createdAt: exp.createdAt.toISOString(),
        remixCount: exp.remixCount,
        cookCount: exp.cookCount,
        voteCount: exp.voteCount,
        resultCount: exp.resultCount,
        children: [],
      });
    }

    // Connect child nodes to their parents
    let rootNode: ExperimentTreeNode | null = null;
    for (const exp of family) {
      const node = nodeMap.get(exp.id)!;
      if (exp.id === targetRootId || exp.parentId === null) {
        rootNode = node;
      } else if (exp.parentId && nodeMap.has(exp.parentId)) {
        nodeMap.get(exp.parentId)!.children.push(node);
      }
    }

    // Fallback if rootNode wasn't explicitly matched
    if (!rootNode) {
      rootNode = nodeMap.get(target.id) ?? {
        id: target.id,
        title: target.title,
        creator: {
          id: target.creatorId,
          username: 'unknown',
          displayName: 'Unknown',
          avatarUrl: null,
          skillLevel: 'beginner',
        },
        parentId: target.parentId,
        rootId: target.rootId,
        branchDepth: target.branchDepth,
        createdAt: target.createdAt.toISOString(),
        remixCount: target.remixCount,
        cookCount: target.cookCount,
        voteCount: target.voteCount,
        resultCount: target.resultCount,
        children: [],
      };
    }

    const flatNodes = family.map((exp) => ({
      id: exp.id,
      title: exp.title,
      creator: toSafeCreator(exp.creator),
      parentId: exp.parentId,
      rootId: exp.rootId,
      branchDepth: exp.branchDepth,
      createdAt: exp.createdAt.toISOString(),
      remixCount: exp.remixCount,
      cookCount: exp.cookCount,
      voteCount: exp.voteCount,
      resultCount: exp.resultCount,
    }));

    return {
      rootId: targetRootId,
      targetExperimentId: id,
      totalNodes: family.length,
      tree: rootNode,
      nodes: flatNodes,
    };
  }

  /**
   * Validate that referenced canonical ingredient IDs actually exist
   */
  private async validateCanonicalIngredients(
    ingredients?: { canonicalId?: string }[],
  ): Promise<void> {
    if (!ingredients || ingredients.length === 0) return;

    const canonicalIds = ingredients
      .map((i) => i.canonicalId)
      .filter((id): id is string => Boolean(id));

    if (canonicalIds.length === 0) return;

    const existing = await this.prisma.ingredient.findMany({
      where: { id: { in: canonicalIds } },
      select: { id: true },
    });

    const existingSet = new Set(existing.map((e) => e.id));
    for (const id of canonicalIds) {
      if (!existingSet.has(id)) {
        throw new BadRequestException(`Canonical ingredient with ID "${id}" does not exist`);
      }
    }
  }

  /**
   * Public discovery feed for browsing and exploring food experiments
   * Supports multi-dimensional filtering, deterministic ordering, and pagination
   */
  async findAll(query: ExperimentQueryDto): Promise<PaginatedExperimentsResponse> {
    const where: any = {
      safetyStatus: { not: 'BLOCKED' },
    };

    if (query.search) {
      const term = query.search.trim();
      if (term.length > 0) {
        where.OR = [
          { title: { contains: term, mode: 'insensitive' } },
          { description: { contains: term, mode: 'insensitive' } },
        ];
      }
    }

    if (query.difficulty) {
      where.difficulty = query.difficulty;
    }

    if (query.canonicalIngredientId) {
      where.ingredients = {
        some: {
          canonicalId: query.canonicalIngredientId,
        },
      };
    }

    if (query.creatorId) {
      where.creatorId = query.creatorId;
    }

    if (query.rootOnly !== undefined) {
      where.parentId = query.rootOnly ? null : { not: null };
    }

    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      this.prisma.experiment.findMany({
        where,
        include: {
          creator: { select: SAFE_CREATOR_SELECT },
          ingredients: true,
        },
        orderBy: this.getOrderBy(query.sort),
        skip,
        take: limit,
      }),
      this.prisma.experiment.count({ where }),
    ]);

    const totalPages = Math.ceil(total / limit) || (total === 0 ? 0 : 1);
    const hasMore = page < totalPages;

    return {
      items: items.map(toExperimentResponse as any),
      total,
      page,
      limit,
      totalPages,
      hasMore,
    };
  }

  /**
   * Authenticated creator feed for listing user's own experiments
   */
  async findMyExperiments(
    userId: string,
    query: UserExperimentsQueryDto,
  ): Promise<PaginatedExperimentsResponse> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const where = {
      creatorId: userId,
    };

    const [items, total] = await Promise.all([
      this.prisma.experiment.findMany({
        where,
        include: {
          creator: { select: SAFE_CREATOR_SELECT },
          ingredients: true,
        },
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        skip,
        take: limit,
      }),
      this.prisma.experiment.count({ where }),
    ]);

    const totalPages = Math.ceil(total / limit) || (total === 0 ? 0 : 1);
    const hasMore = page < totalPages;

    return {
      items: items.map(toExperimentResponse as any),
      total,
      page,
      limit,
      totalPages,
      hasMore,
    };
  }

  /**
   * Determine deterministic ordering based on sort parameter.
   * Every sort mode includes stable tie-breakers ({ createdAt: 'desc' }, { id: 'desc' }).
   */
  private getOrderBy(sort: ExperimentSort = 'trending') {
    switch (sort) {
      case 'trending':
        return [
          { remixCount: 'desc' as const },
          { cookCount: 'desc' as const },
          { voteCount: 'desc' as const },
          { resultCount: 'desc' as const },
          { createdAt: 'desc' as const },
          { id: 'desc' as const },
        ];
      case 'recent':
        return [{ createdAt: 'desc' as const }, { id: 'desc' as const }];
      case 'remixes':
        return [
          { remixCount: 'desc' as const },
          { createdAt: 'desc' as const },
          { id: 'desc' as const },
        ];
      case 'cooks':
        return [
          { cookCount: 'desc' as const },
          { createdAt: 'desc' as const },
          { id: 'desc' as const },
        ];
      case 'votes':
        return [
          { voteCount: 'desc' as const },
          { createdAt: 'desc' as const },
          { id: 'desc' as const },
        ];
      default:
        return [{ createdAt: 'desc' as const }, { id: 'desc' as const }];
    }
  }
}
