import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import type { ActivityQueryDto } from './dto/activity-query.dto';
import type {
  ActivityItem,
  PaginatedActivityResponse,
  ActivityEventType,
} from './dto/activity-response.dto';

const SAFE_ACTOR_SELECT = {
  id: true,
  username: true,
  displayName: true,
  avatarUrl: true,
  skillLevel: true,
};

@Injectable()
export class ActivityService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Retrieve community activity feed combining:
   * - Root experiment creations
   * - Remix creations
   * - Cooking result outcomes
   *
   * Upholds safety rules: never exposes BLOCKED experiments.
   * Upholds privacy: exposes only public creator information.
   * Deterministic ordering by [createdAt DESC, id DESC].
   */
  async getActivity(query: ActivityQueryDto): Promise<PaginatedActivityResponse> {
    const page = Math.max(1, query.page || 1);
    const limit = Math.min(Math.max(1, query.limit || 20), 50);
    const type = query.type || 'all';

    // How many items from each table to fetch for reliable merged pagination
    const fetchUpTo = Math.min(page * limit, 500);

    const safeExperimentWhere = {
      safetyStatus: { not: 'BLOCKED' },
    };

    if (type === 'root_experiment') {
      const where = {
        ...safeExperimentWhere,
        parentId: null,
      };

      const [experiments, total] = await Promise.all([
        this.prisma.experiment.findMany({
          where,
          include: {
            creator: { select: SAFE_ACTOR_SELECT },
          },
          orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
          skip: (page - 1) * limit,
          take: limit,
        }),
        this.prisma.experiment.count({ where }),
      ]);

      const items: ActivityItem[] = experiments.map((exp) => this.mapExperimentToActivity(exp));
      const totalPages = Math.ceil(total / limit) || 1;

      return {
        items,
        total,
        page,
        limit,
        totalPages,
        hasMore: page < totalPages,
      };
    }

    if (type === 'remix') {
      const where = {
        ...safeExperimentWhere,
        parentId: { not: null },
      };

      const [remixes, total] = await Promise.all([
        this.prisma.experiment.findMany({
          where,
          include: {
            creator: { select: SAFE_ACTOR_SELECT },
            parent: { select: { id: true, title: true } },
          },
          orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
          skip: (page - 1) * limit,
          take: limit,
        }),
        this.prisma.experiment.count({ where }),
      ]);

      const items: ActivityItem[] = remixes.map((exp) => this.mapExperimentToActivity(exp));
      const totalPages = Math.ceil(total / limit) || 1;

      return {
        items,
        total,
        page,
        limit,
        totalPages,
        hasMore: page < totalPages,
      };
    }

    if (type === 'cooking_result') {
      const where = {
        experiment: safeExperimentWhere,
      };

      const [results, total] = await Promise.all([
        this.prisma.cookingResult.findMany({
          where,
          include: {
            user: { select: SAFE_ACTOR_SELECT },
            experiment: {
              select: {
                id: true,
                title: true,
                difficulty: true,
                heroMedia: true,
                safetyStatus: true,
              },
            },
          },
          orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
          skip: (page - 1) * limit,
          take: limit,
        }),
        this.prisma.cookingResult.count({ where }),
      ]);

      const items: ActivityItem[] = results
        .filter((cr) => cr.experiment && cr.experiment.safetyStatus !== 'BLOCKED')
        .map((cr) => this.mapCookingResultToActivity(cr));
      const totalPages = Math.ceil(total / limit) || 1;

      return {
        items,
        total,
        page,
        limit,
        totalPages,
        hasMore: page < totalPages,
      };
    }

    // Type === 'all': Fetch top candidates from both streams and merge
    const [experiments, cookingResults, expTotal, crTotal] = await Promise.all([
      this.prisma.experiment.findMany({
        where: safeExperimentWhere,
        include: {
          creator: { select: SAFE_ACTOR_SELECT },
          parent: { select: { id: true, title: true } },
        },
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        take: fetchUpTo,
      }),
      this.prisma.cookingResult.findMany({
        where: {
          experiment: safeExperimentWhere,
        },
        include: {
          user: { select: SAFE_ACTOR_SELECT },
          experiment: {
            select: {
              id: true,
              title: true,
              difficulty: true,
              heroMedia: true,
              safetyStatus: true,
            },
          },
        },
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        take: fetchUpTo,
      }),
      this.prisma.experiment.count({ where: safeExperimentWhere }),
      this.prisma.cookingResult.count({ where: { experiment: safeExperimentWhere } }),
    ]);

    const experimentItems: ActivityItem[] = experiments.map((exp) =>
      this.mapExperimentToActivity(exp),
    );
    const cookingItems: ActivityItem[] = cookingResults
      .filter((cr) => cr.experiment && cr.experiment.safetyStatus !== 'BLOCKED')
      .map((cr) => this.mapCookingResultToActivity(cr));

    // Merge and deterministically sort by [createdAt DESC, id DESC]
    const merged = [...experimentItems, ...cookingItems].sort((a, b) => {
      const timeDiff = new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      if (timeDiff !== 0) return timeDiff;
      return b.id.localeCompare(a.id);
    });

    const start = (page - 1) * limit;
    const items = merged.slice(start, start + limit);
    const total = expTotal + crTotal;
    const totalPages = Math.ceil(total / limit) || 1;

    return {
      items,
      total,
      page,
      limit,
      totalPages,
      hasMore: page < totalPages,
    };
  }

  private mapExperimentToActivity(exp: any): ActivityItem {
    const isRemix = exp.parentId !== null;
    const eventType: ActivityEventType = isRemix ? 'remix' : 'root_experiment';
    const actorName = exp.creator?.displayName || exp.creator?.username || 'Chef';

    let message: string;
    if (isRemix) {
      const parentTitle = exp.parent?.title ? `"${exp.parent.title}"` : 'a recipe';
      message = `${actorName} remixed ${parentTitle} into "${exp.title}"`;
    } else {
      message = `${actorName} cooked up a new root experiment: "${exp.title}"`;
    }

    return {
      id: `exp-${exp.id}`,
      type: eventType,
      createdAt: exp.createdAt.toISOString(),
      title: exp.title,
      message,
      actor: {
        id: exp.creator.id,
        username: exp.creator.username,
        displayName: exp.creator.displayName,
        avatarUrl: exp.creator.avatarUrl,
        skillLevel: exp.creator.skillLevel,
      },
      experiment: {
        id: exp.id,
        title: exp.title,
        difficulty: exp.difficulty,
        heroMedia: exp.heroMedia,
        parentId: exp.parentId,
        parentTitle: exp.parent?.title ?? null,
        branchDepth: exp.branchDepth,
      },
      cookingResult: null,
    };
  }

  private mapCookingResultToActivity(cr: any): ActivityItem {
    const actorName = cr.user?.displayName || cr.user?.username || 'A cook';
    const experimentTitle = cr.experiment?.title || 'an experiment';
    const message = `${actorName} posted cooking results for "${experimentTitle}"`;

    return {
      id: `cr-${cr.id}`,
      type: 'cooking_result',
      createdAt: cr.createdAt.toISOString(),
      title: experimentTitle,
      message,
      actor: {
        id: cr.user.id,
        username: cr.user.username,
        displayName: cr.user.displayName,
        avatarUrl: cr.user.avatarUrl,
        skillLevel: cr.user.skillLevel,
      },
      experiment: {
        id: cr.experiment.id,
        title: cr.experiment.title,
        difficulty: cr.experiment.difficulty,
        heroMedia: cr.experiment.heroMedia,
      },
      cookingResult: {
        id: cr.id,
        outcomeTag: cr.outcomeTag,
        tasteRating: cr.tasteRating,
        textureRating: cr.textureRating,
        wouldMakeAgain: cr.wouldMakeAgain,
        caption: cr.caption,
        media: cr.media,
      },
    };
  }
}
