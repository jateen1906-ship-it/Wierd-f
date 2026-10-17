import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import type {
  PaginatedNotificationsResponse,
  NotificationItem,
} from './dto/notification-response.dto';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Notify existing followers when a creator creates a root experiment or remix.
   * - Only targets existing followers at creation time
   * - Excludes the creator themselves (no self-notifications)
   * - Uses createMany with skipDuplicates for idempotency on retried operations
   */
  async notifyFollowersOfNewExperiment(
    creatorId: string,
    experimentId: string,
    experimentTitle: string,
    isRemix = false,
  ): Promise<number> {
    try {
      // 1. Fetch all followers of creatorId
      const followers = await this.prisma.userFollow.findMany({
        where: { followingId: creatorId },
        select: { followerId: true },
      });

      // Filter out creator self
      const targetFollowerIds = followers
        .map((f) => f.followerId)
        .filter((fid) => fid !== creatorId);

      if (targetFollowerIds.length === 0) {
        return 0;
      }

      // 2. Fetch creator name for friendly message
      const creator = await this.prisma.user.findUnique({
        where: { id: creatorId },
        select: { username: true, displayName: true },
      });

      const creatorName = creator?.displayName || creator?.username || 'A creator you follow';
      const actionText = isRemix ? 'remixed a new recipe' : 'cooked up a new experiment';
      const message = `${creatorName} ${actionText}: "${experimentTitle}"`;
      const type = 'NEW_EXPERIMENT';

      // 3. Batch insert notifications with skipDuplicates for idempotency
      const result = await this.prisma.notification.createMany({
        data: targetFollowerIds.map((followerId) => ({
          userId: followerId,
          actorId: creatorId,
          type,
          experimentId,
          title: experimentTitle,
          message,
          isRead: false,
        })),
        skipDuplicates: true,
      });

      this.logger.log(
        `Created ${result.count} notification(s) for experiment [${experimentId}] by [${creatorId}]`,
      );
      return result.count;
    } catch (err) {
      this.logger.error(`Failed to notify followers for experiment [${experimentId}]:`, err);
      return 0;
    }
  }

  /**
   * List paginated notifications for the authenticated user.
   * Strictly filters out notifications referencing BLOCKED experiments to uphold safety rules.
   */
  async getNotifications(
    userId: string,
    page = 1,
    limit = 20,
  ): Promise<PaginatedNotificationsResponse> {
    const safeLimit = Math.min(Math.max(1, limit), 50);
    const skip = (Math.max(1, page) - 1) * safeLimit;

    const where = {
      userId,
      experiment: {
        safetyStatus: { not: 'BLOCKED' },
      },
    };

    const [notifications, total] = await Promise.all([
      this.prisma.notification.findMany({
        where,
        include: {
          actor: {
            select: {
              id: true,
              username: true,
              displayName: true,
              avatarUrl: true,
              skillLevel: true,
            },
          },
          experiment: {
            select: {
              id: true,
              title: true,
              difficulty: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: safeLimit,
      }),
      this.prisma.notification.count({ where }),
    ]);

    const items: NotificationItem[] = notifications.map((n) => ({
      id: n.id,
      type: n.type,
      title: n.title,
      message: n.message,
      isRead: n.isRead,
      createdAt: n.createdAt.toISOString(),
      actor: {
        id: n.actor.id,
        username: n.actor.username,
        displayName: n.actor.displayName,
        avatarUrl: n.actor.avatarUrl,
        skillLevel: n.actor.skillLevel,
      },
      experiment: {
        id: n.experiment.id,
        title: n.experiment.title,
        difficulty: n.experiment.difficulty,
      },
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

  /**
   * Get unread notification count for the authenticated user
   */
  async getUnreadCount(userId: string): Promise<number> {
    return this.prisma.notification.count({
      where: {
        userId,
        isRead: false,
        experiment: {
          safetyStatus: { not: 'BLOCKED' },
        },
      },
    });
  }

  /**
   * Mark a single notification as read
   */
  async markAsRead(userId: string, notificationId: string): Promise<NotificationItem> {
    const notification = await this.prisma.notification.findFirst({
      where: {
        id: notificationId,
        userId,
      },
      include: {
        actor: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatarUrl: true,
            skillLevel: true,
          },
        },
        experiment: {
          select: {
            id: true,
            title: true,
            difficulty: true,
          },
        },
      },
    });

    if (!notification) {
      throw new NotFoundException(`Notification with ID "${notificationId}" not found`);
    }

    if (!notification.isRead) {
      await this.prisma.notification.update({
        where: { id: notificationId },
        data: { isRead: true },
      });
      notification.isRead = true;
    }

    return {
      id: notification.id,
      type: notification.type,
      title: notification.title,
      message: notification.message,
      isRead: notification.isRead,
      createdAt: notification.createdAt.toISOString(),
      actor: {
        id: notification.actor.id,
        username: notification.actor.username,
        displayName: notification.actor.displayName,
        avatarUrl: notification.actor.avatarUrl,
        skillLevel: notification.actor.skillLevel,
      },
      experiment: {
        id: notification.experiment.id,
        title: notification.experiment.title,
        difficulty: notification.experiment.difficulty,
      },
    };
  }

  /**
   * Mark all notifications as read for the user
   */
  async markAllAsRead(userId: string): Promise<{ count: number }> {
    const result = await this.prisma.notification.updateMany({
      where: {
        userId,
        isRead: false,
      },
      data: { isRead: true },
    });

    return { count: result.count };
  }
}
