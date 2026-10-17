import { apiClient, ApiError } from './api-client';

describe('Notifications API Client', () => {
  beforeEach(() => {
    jest.restoreAllMocks();
    apiClient.setToken('test-notification-jwt-token');
  });

  afterEach(() => {
    apiClient.setToken(null);
  });

  describe('apiClient.notifications.list', () => {
    it('fetches paginated notifications with auth header and pagination parameters', async () => {
      const mockResponse = {
        items: [
          {
            id: 'notif-1',
            type: 'NEW_EXPERIMENT',
            title: 'Kimchi Cheese Toast',
            message: 'Chef Jane cooked up a new experiment: "Kimchi Cheese Toast"',
            isRead: false,
            createdAt: '2026-10-18T00:00:00Z',
            actor: {
              id: 'actor-1',
              username: 'chef_jane',
              displayName: 'Chef Jane',
              avatarUrl: null,
              skillLevel: 'kettle_pro',
            },
            experiment: {
              id: 'exp-1',
              title: 'Kimchi Cheese Toast',
              difficulty: 'easy',
            },
          },
        ],
        total: 1,
        page: 1,
        limit: 20,
        totalPages: 1,
        hasMore: false,
      };

      const fetchSpy = jest.fn().mockResolvedValue({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => mockResponse,
      });
      global.fetch = fetchSpy;

      const res = await apiClient.notifications.list(1, 20);

      expect(res.items).toHaveLength(1);
      expect(res.items[0].id).toBe('notif-1');
      expect(res.items[0].isRead).toBe(false);
      expect(res.items[0].actor.username).toBe('chef_jane');

      expect(fetchSpy).toHaveBeenCalledWith(
        expect.stringContaining('/notifications?page=1&limit=20'),
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer test-notification-jwt-token',
          }),
        }),
      );
    });

    it('throws ApiError on server error', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 401,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({ message: 'Unauthorized' }),
      });

      await expect(apiClient.notifications.list(1, 10)).rejects.toThrow(ApiError);
    });
  });

  describe('apiClient.notifications.unreadCount', () => {
    it('fetches unread notification count', async () => {
      const fetchSpy = jest.fn().mockResolvedValue({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({ unreadCount: 5 }),
      });
      global.fetch = fetchSpy;

      const res = await apiClient.notifications.unreadCount();

      expect(res).toEqual({ unreadCount: 5 });
      expect(fetchSpy).toHaveBeenCalledWith(
        expect.stringContaining('/notifications/unread-count'),
        expect.any(Object),
      );
    });
  });

  describe('apiClient.notifications.markAsRead', () => {
    it('sends PATCH request to mark a notification as read', async () => {
      const mockUpdated = {
        id: 'notif-1',
        type: 'NEW_EXPERIMENT',
        title: 'Toast',
        message: 'Message',
        isRead: true,
        createdAt: '2026-10-18T00:00:00Z',
        actor: {
          id: 'actor-1',
          username: 'chef_jane',
          displayName: 'Chef Jane',
          avatarUrl: null,
          skillLevel: 'kettle_pro',
        },
        experiment: {
          id: 'exp-1',
          title: 'Toast',
        },
      };

      const fetchSpy = jest.fn().mockResolvedValue({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => mockUpdated,
      });
      global.fetch = fetchSpy;

      const res = await apiClient.notifications.markAsRead('notif-1');

      expect(res.id).toBe('notif-1');
      expect(res.isRead).toBe(true);
      expect(fetchSpy).toHaveBeenCalledWith(
        expect.stringContaining('/notifications/notif-1/read'),
        expect.objectContaining({
          method: 'PATCH',
          headers: expect.objectContaining({
            Authorization: 'Bearer test-notification-jwt-token',
          }),
        }),
      );
    });
  });

  describe('apiClient.notifications.markAllAsRead', () => {
    it('sends PATCH request to mark all user notifications as read', async () => {
      const fetchSpy = jest.fn().mockResolvedValue({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({ count: 4 }),
      });
      global.fetch = fetchSpy;

      const res = await apiClient.notifications.markAllAsRead();

      expect(res).toEqual({ count: 4 });
      expect(fetchSpy).toHaveBeenCalledWith(
        expect.stringContaining('/notifications/read-all'),
        expect.objectContaining({
          method: 'PATCH',
          headers: expect.objectContaining({
            Authorization: 'Bearer test-notification-jwt-token',
          }),
        }),
      );
    });
  });
});
