import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import type {
  PublicUserProfileResponse,
  FollowActionResult,
  PaginatedFollowingResponse,
} from './dto/public-profile-response.dto';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Retrieve sanitized public profile for a creator by username.
   * Strictly never leaks email, passwordHash, private preferences, or personal voting history.
   * Respects experiment safety rules by excluding blocked experiments from public counts.
   * Includes public follower/following counts and whether the viewing user follows this creator.
   */
  async getPublicProfile(
    username: string,
    viewerUserId?: string,
  ): Promise<PublicUserProfileResponse> {
    const user = await this.prisma.user.findFirst({
      where: {
        username: {
          equals: username.trim(),
          mode: 'insensitive',
        },
      },
      select: {
        id: true,
        username: true,
        displayName: true,
        avatarUrl: true,
        bio: true,
        skillLevel: true,
        createdAt: true,
      },
    });

    if (!user) {
      throw new NotFoundException(`Creator with username "${username}" not found`);
    }

    const [experimentsCount, cookingResultsCount, remixesCount, followersCount, followingCount] =
      await Promise.all([
        this.prisma.experiment.count({
          where: {
            creatorId: user.id,
            safetyStatus: { not: 'BLOCKED' },
          },
        }),
        this.prisma.cookingResult.count({
          where: {
            userId: user.id,
            experiment: { safetyStatus: { not: 'BLOCKED' } },
          },
        }),
        this.prisma.experiment.count({
          where: {
            creatorId: user.id,
            parentId: { not: null },
            safetyStatus: { not: 'BLOCKED' },
          },
        }),
        this.prisma.userFollow.count({
          where: {
            followingId: user.id,
          },
        }),
        this.prisma.userFollow.count({
          where: {
            followerId: user.id,
          },
        }),
      ]);

    let isFollowing: boolean | undefined = undefined;
    if (viewerUserId && viewerUserId !== user.id) {
      const followRecord = await this.prisma.userFollow.findUnique({
        where: {
          unique_user_follow: {
            followerId: viewerUserId,
            followingId: user.id,
          },
        },
      });
      isFollowing = !!followRecord;
    } else if (viewerUserId && viewerUserId === user.id) {
      isFollowing = false;
    }

    return {
      id: user.id,
      username: user.username,
      displayName: user.displayName,
      avatarUrl: user.avatarUrl,
      bio: user.bio,
      skillLevel: user.skillLevel,
      createdAt: user.createdAt.toISOString(),
      stats: {
        experimentsCount,
        cookingResultsCount,
        remixesCount,
        followersCount,
        followingCount,
      },
      isFollowing,
    };
  }

  /**
   * Follow a public creator by username.
   * Prevents self-follow and ensures duplicate requests are idempotent without error.
   */
  async followUser(followerId: string, targetUsername: string): Promise<FollowActionResult> {
    const targetUser = await this.prisma.user.findFirst({
      where: {
        username: {
          equals: targetUsername.trim(),
          mode: 'insensitive',
        },
      },
      select: {
        id: true,
        username: true,
      },
    });

    if (!targetUser) {
      throw new NotFoundException(`Creator with username "${targetUsername}" not found`);
    }

    if (targetUser.id === followerId) {
      throw new BadRequestException('You cannot follow yourself');
    }

    // Idempotent upsert prevents duplicates even under concurrent follow clicks
    await this.prisma.userFollow.upsert({
      where: {
        unique_user_follow: {
          followerId,
          followingId: targetUser.id,
        },
      },
      create: {
        followerId,
        followingId: targetUser.id,
      },
      update: {},
    });

    const followersCount = await this.prisma.userFollow.count({
      where: {
        followingId: targetUser.id,
      },
    });

    return {
      success: true,
      isFollowing: true,
      followersCount,
    };
  }

  /**
   * Unfollow a creator by username.
   * Idempotent: returns current unfollowed state without error if already unfollowed.
   */
  async unfollowUser(followerId: string, targetUsername: string): Promise<FollowActionResult> {
    const targetUser = await this.prisma.user.findFirst({
      where: {
        username: {
          equals: targetUsername.trim(),
          mode: 'insensitive',
        },
      },
      select: {
        id: true,
        username: true,
      },
    });

    if (!targetUser) {
      throw new NotFoundException(`Creator with username "${targetUsername}" not found`);
    }

    if (targetUser.id === followerId) {
      throw new BadRequestException('You cannot unfollow yourself');
    }

    // Delete matching follow record if exists
    await this.prisma.userFollow.deleteMany({
      where: {
        followerId,
        followingId: targetUser.id,
      },
    });

    const followersCount = await this.prisma.userFollow.count({
      where: {
        followingId: targetUser.id,
      },
    });

    return {
      success: true,
      isFollowing: false,
      followersCount,
    };
  }

  /**
   * Retrieve paginated list of creators followed by the specified user.
   */
  async getFollowingList(
    userId: string,
    page = 1,
    limit = 20,
  ): Promise<PaginatedFollowingResponse> {
    const safeLimit = Math.min(Math.max(1, limit), 50);
    const skip = (Math.max(1, page) - 1) * safeLimit;

    const [follows, total] = await Promise.all([
      this.prisma.userFollow.findMany({
        where: {
          followerId: userId,
        },
        include: {
          following: {
            select: {
              id: true,
              username: true,
              displayName: true,
              avatarUrl: true,
              skillLevel: true,
              bio: true,
            },
          },
        },
        skip,
        take: safeLimit,
        orderBy: {
          createdAt: 'desc',
        },
      }),
      this.prisma.userFollow.count({
        where: {
          followerId: userId,
        },
      }),
    ]);

    const items = follows.map((f) => ({
      id: f.following.id,
      username: f.following.username,
      displayName: f.following.displayName,
      avatarUrl: f.following.avatarUrl,
      skillLevel: f.following.skillLevel,
      bio: f.following.bio,
      followedAt: f.createdAt.toISOString(),
    }));

    const totalPages = Math.ceil(total / safeLimit) || 1;

    return {
      items,
      total,
      page,
      limit: safeLimit,
      totalPages,
      hasMore: page < totalPages,
    };
  }
}
