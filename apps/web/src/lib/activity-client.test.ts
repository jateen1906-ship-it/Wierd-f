import { apiClient, ApiError } from './api-client';

describe('Activity API Client', () => {
  beforeEach(() => {
    jest.restoreAllMocks();
  });

  describe('apiClient.activity.feed', () => {
    it('fetches community activity feed with query options', async () => {
      const mockActivityResponse = {
        items: [
          {
            id: 'exp-1',
            type: 'root_experiment',
            createdAt: '2026-10-18T12:00:00Z',
            title: 'Kettle Butter Maggi',
            message: 'Chef Jateen cooked up a new root experiment: "Kettle Butter Maggi"',
            actor: {
              id: 'actor-1',
              username: 'chef_jateen',
              displayName: 'Chef Jateen',
              avatarUrl: null,
              skillLevel: 'kettle_pro',
            },
            experiment: {
              id: 'exp-1',
              title: 'Kettle Butter Maggi',
              difficulty: 'easy',
            },
            cookingResult: null,
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
        json: async () => mockActivityResponse,
      });
      global.fetch = fetchSpy;

      const res = await apiClient.activity.feed({ page: 1, limit: 20, type: 'root_experiment' });

      expect(res.items).toHaveLength(1);
      expect(res.items[0].type).toBe('root_experiment');
      expect(res.items[0].actor.username).toBe('chef_jateen');

      expect(fetchSpy).toHaveBeenCalledWith(
        expect.stringContaining('/activity?page=1&limit=20&type=root_experiment'),
        expect.any(Object),
      );
    });

    it('queries /activity without type param when type="all"', async () => {
      const fetchSpy = jest.fn().mockResolvedValue({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({
          items: [],
          total: 0,
          page: 1,
          limit: 10,
          totalPages: 0,
          hasMore: false,
        }),
      });
      global.fetch = fetchSpy;

      await apiClient.activity.feed({ page: 1, limit: 10, type: 'all' });

      expect(fetchSpy).toHaveBeenCalledWith(
        expect.stringContaining('/activity?page=1&limit=10'),
        expect.any(Object),
      );
    });

    it('handles ApiError on failure', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 500,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({ message: 'Server error' }),
      });

      await expect(apiClient.activity.feed()).rejects.toThrow(ApiError);
    });
  });
});
