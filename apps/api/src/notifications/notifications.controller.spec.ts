import { Test, TestingModule } from '@nestjs/testing';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';
import type { AuthenticatedUser } from '../auth/dto/auth-response.dto';

describe('NotificationsController', () => {
  let controller: NotificationsController;
  let service: {
    getNotifications: jest.Mock;
    getUnreadCount: jest.Mock;
    markAsRead: jest.Mock;
    markAllAsRead: jest.Mock;
  };

  const mockUser: AuthenticatedUser = {
    userId: 'user-uuid-1',
    username: 'foodie_jane',
  };

  beforeEach(async () => {
    service = {
      getNotifications: jest.fn(),
      getUnreadCount: jest.fn(),
      markAsRead: jest.fn(),
      markAllAsRead: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [NotificationsController],
      providers: [
        {
          provide: NotificationsService,
          useValue: service,
        },
      ],
    }).compile();

    controller = module.get<NotificationsController>(NotificationsController);
  });

  describe('GET /notifications', () => {
    it('calls service.getNotifications with query page and limit', async () => {
      const mockResult = {
        items: [],
        total: 0,
        page: 2,
        limit: 10,
        totalPages: 0,
        hasMore: false,
      };
      service.getNotifications.mockResolvedValue(mockResult);

      const result = await controller.getNotifications(mockUser, 2, 10);
      expect(result).toBe(mockResult);
      expect(service.getNotifications).toHaveBeenCalledWith(mockUser.userId, 2, 10);
    });
  });

  describe('GET /notifications/unread-count', () => {
    it('returns unread count for user', async () => {
      service.getUnreadCount.mockResolvedValue(4);

      const result = await controller.getUnreadCount(mockUser);
      expect(result).toEqual({ unreadCount: 4 });
      expect(service.getUnreadCount).toHaveBeenCalledWith(mockUser.userId);
    });
  });

  describe('PATCH /notifications/:id/read', () => {
    it('marks a single notification as read', async () => {
      const mockNotification = {
        id: 'n-123',
        type: 'NEW_EXPERIMENT',
        title: 'Toast',
        message: 'Message',
        isRead: true,
        createdAt: '2026-10-18T00:00:00.000Z',
        actor: {
          id: 'actor-1',
          username: 'actor',
          displayName: 'Actor',
          avatarUrl: null,
          skillLevel: 'ADVANCED',
        },
        experiment: {
          id: 'exp-1',
          title: 'Toast',
          difficulty: 'EASY',
        },
      };
      service.markAsRead.mockResolvedValue(mockNotification);

      const result = await controller.markAsRead(mockUser, 'n-123');
      expect(result).toEqual(mockNotification);
      expect(service.markAsRead).toHaveBeenCalledWith(mockUser.userId, 'n-123');
    });
  });

  describe('PATCH /notifications/read-all', () => {
    it('marks all notifications as read', async () => {
      service.markAllAsRead.mockResolvedValue({ count: 3 });

      const result = await controller.markAllAsRead(mockUser);
      expect(result).toEqual({ count: 3 });
      expect(service.markAllAsRead).toHaveBeenCalledWith(mockUser.userId);
    });
  });
});
