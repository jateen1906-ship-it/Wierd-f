import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { PrismaService } from '../database/prisma.service';

describe('NotificationsService', () => {
  let service: NotificationsService;
  let prisma: {
    userFollow: { findMany: jest.Mock };
    user: { findUnique: jest.Mock };
    notification: {
      createMany: jest.Mock;
      findMany: jest.Mock;
      count: jest.Mock;
      findFirst: jest.Mock;
      findUnique: jest.Mock;
      update: jest.Mock;
      updateMany: jest.Mock;
    };
  };

  const mockCreatorId = 'creator-uuid-1';
  const mockFollower1Id = 'follower-uuid-1';
  const mockFollower2Id = 'follower-uuid-2';
  const mockExperimentId = 'exp-uuid-1';

  beforeEach(async () => {
    prisma = {
      userFollow: {
        findMany: jest.fn(),
      },
      user: {
        findUnique: jest.fn(),
      },
      notification: {
        createMany: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
        findFirst: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [NotificationsService, { provide: PrismaService, useValue: prisma }],
    }).compile();

    service = module.get<NotificationsService>(NotificationsService);
  });

  describe('notifyFollowersOfNewExperiment', () => {
    it('notifies existing followers at experiment creation time and excludes the creator', async () => {
      prisma.userFollow.findMany.mockResolvedValue([
        { followerId: mockFollower1Id },
        { followerId: mockFollower2Id },
        { followerId: mockCreatorId }, // Self follow edge case
      ]);

      prisma.user.findUnique.mockResolvedValue({
        username: 'culinary_master',
        displayName: 'Chef Master',
      });

      prisma.notification.createMany.mockResolvedValue({ count: 2 });

      const count = await service.notifyFollowersOfNewExperiment(
        mockCreatorId,
        mockExperimentId,
        'Smoked Kimchi Toast',
        false,
      );

      expect(count).toBe(2);
      expect(prisma.userFollow.findMany).toHaveBeenCalledWith({
        where: { followingId: mockCreatorId },
        select: { followerId: true },
      });

      expect(prisma.notification.createMany).toHaveBeenCalledWith({
        data: [
          {
            userId: mockFollower1Id,
            actorId: mockCreatorId,
            type: 'NEW_EXPERIMENT',
            experimentId: mockExperimentId,
            title: 'Smoked Kimchi Toast',
            message: 'Chef Master cooked up a new experiment: "Smoked Kimchi Toast"',
            isRead: false,
          },
          {
            userId: mockFollower2Id,
            actorId: mockCreatorId,
            type: 'NEW_EXPERIMENT',
            experimentId: mockExperimentId,
            title: 'Smoked Kimchi Toast',
            message: 'Chef Master cooked up a new experiment: "Smoked Kimchi Toast"',
            isRead: false,
          },
        ],
        skipDuplicates: true,
      });
    });

    it('customizes message for remixes', async () => {
      prisma.userFollow.findMany.mockResolvedValue([{ followerId: mockFollower1Id }]);
      prisma.user.findUnique.mockResolvedValue({
        username: 'remix_king',
        displayName: null,
      });
      prisma.notification.createMany.mockResolvedValue({ count: 1 });

      await service.notifyFollowersOfNewExperiment(
        mockCreatorId,
        mockExperimentId,
        'Spicy Mayo Ramen',
        true,
      );

      expect(prisma.notification.createMany).toHaveBeenCalledWith({
        data: [
          expect.objectContaining({
            message: 'remix_king remixed a new recipe: "Spicy Mayo Ramen"',
          }),
        ],
        skipDuplicates: true,
      });
    });

    it('returns 0 and does not insert when creator has no followers', async () => {
      prisma.userFollow.findMany.mockResolvedValue([]);

      const count = await service.notifyFollowersOfNewExperiment(
        mockCreatorId,
        mockExperimentId,
        'Lone Recipe',
        false,
      );

      expect(count).toBe(0);
      expect(prisma.notification.createMany).not.toHaveBeenCalled();
    });

    it('avoids duplicates on retried operations via skipDuplicates', async () => {
      prisma.userFollow.findMany.mockResolvedValue([{ followerId: mockFollower1Id }]);
      prisma.user.findUnique.mockResolvedValue({ username: 'creator' });
      prisma.notification.createMany.mockResolvedValue({ count: 0 });

      const count = await service.notifyFollowersOfNewExperiment(
        mockCreatorId,
        mockExperimentId,
        'Retried Experiment',
        false,
      );

      expect(count).toBe(0);
      expect(prisma.notification.createMany).toHaveBeenCalledWith(
        expect.objectContaining({ skipDuplicates: true }),
      );
    });
  });

  describe('getNotifications & Safety filtering', () => {
    it('returns paginated notifications and strictly excludes BLOCKED experiments', async () => {
      const mockRawNotifications = [
        {
          id: 'notif-1',
          userId: mockFollower1Id,
          actorId: mockCreatorId,
          type: 'NEW_EXPERIMENT',
          experimentId: mockExperimentId,
          title: 'Safe Experiment',
          message: 'Chef Master cooked up a new experiment',
          isRead: false,
          createdAt: new Date('2026-10-18T00:00:00Z'),
          actor: {
            id: mockCreatorId,
            username: 'chef',
            displayName: 'Chef Master',
            avatarUrl: null,
            skillLevel: 'ADVANCED',
          },
          experiment: {
            id: mockExperimentId,
            title: 'Safe Experiment',
            difficulty: 'EASY',
            heroMedia: null,
            safetyStatus: 'SAFE',
          },
        },
      ];

      prisma.notification.findMany.mockResolvedValue(mockRawNotifications);
      prisma.notification.count.mockResolvedValue(1);

      const result = await service.getNotifications(mockFollower1Id, 1, 10);

      expect(result.items).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(10);
      expect(result.items[0]!.experiment.id).toBe(mockExperimentId);

      expect(prisma.notification.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            userId: mockFollower1Id,
            experiment: {
              safetyStatus: { not: 'BLOCKED' },
            },
          },
        }),
      );
    });
  });

  describe('getUnreadCount & Safety filtering', () => {
    it('returns unread count strictly excluding BLOCKED experiments', async () => {
      prisma.notification.count.mockResolvedValue(3);

      const result = await service.getUnreadCount(mockFollower1Id);

      expect(result).toBe(3);
      expect(prisma.notification.count).toHaveBeenCalledWith({
        where: {
          userId: mockFollower1Id,
          isRead: false,
          experiment: {
            safetyStatus: { not: 'BLOCKED' },
          },
        },
      });
    });
  });

  describe('markAsRead', () => {
    it('marks a single notification as read when owned by user', async () => {
      prisma.notification.findFirst.mockResolvedValue({
        id: 'notif-1',
        userId: mockFollower1Id,
        actorId: mockCreatorId,
        type: 'NEW_EXPERIMENT',
        experimentId: mockExperimentId,
        title: 'Safe Experiment',
        message: 'Message',
        isRead: false,
        createdAt: new Date('2026-10-18T00:00:00Z'),
        actor: {
          id: mockCreatorId,
          username: 'chef',
          displayName: 'Chef Master',
          avatarUrl: null,
          skillLevel: 'ADVANCED',
        },
        experiment: {
          id: mockExperimentId,
          title: 'Safe Experiment',
          difficulty: 'EASY',
        },
      });
      prisma.notification.update.mockResolvedValue({});

      const res = await service.markAsRead(mockFollower1Id, 'notif-1');
      expect(res.id).toBe('notif-1');
      expect(res.isRead).toBe(true);
      expect(prisma.notification.update).toHaveBeenCalledWith({
        where: { id: 'notif-1' },
        data: { isRead: true },
      });
    });

    it('throws NotFoundException if notification does not exist or belongs to another user', async () => {
      prisma.notification.findFirst.mockResolvedValue(null);

      await expect(service.markAsRead(mockFollower1Id, 'notif-1')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('markAllAsRead', () => {
    it('marks all unread notifications as read for the user', async () => {
      prisma.notification.updateMany.mockResolvedValue({ count: 5 });

      const res = await service.markAllAsRead(mockFollower1Id);
      expect(res).toEqual({ count: 5 });
      expect(prisma.notification.updateMany).toHaveBeenCalledWith({
        where: { userId: mockFollower1Id, isRead: false },
        data: { isRead: true },
      });
    });
  });
});
