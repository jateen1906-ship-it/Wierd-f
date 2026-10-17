import { apiClient, ApiError } from './api-client';

describe('Personalized Following Feed API Client & Filtering', () => {
  beforeEach(() => {
    jest.restoreAllMocks();
    apiClient.setToken('test-following-feed-token');
  });

  afterEach(() => {
    apiClient.setToken(null);
  });

  describe('apiClient.experiments.followingFeed', () => {
    it('should query /experiments/feed/following with auth headers and query options', async () => {
      const mockFollowingResponse = {
        items: [
          {
            id: 'exp-followed-101',
            title: 'Kettle Butter Maggi',
            description: 'Created by a creator the user follows',
            difficulty: 'easy',
            branchDepth: 0,
            remixCount: 2,
            cookCount: 5,
            voteCount: 15,
            resultCount: 3,
            createdAt: '2026-10-17T15:00:00Z',
            creator: {
              id: 'creator-followed-1',
              username: 'wing_cook',
              displayName: 'Wing Cook',
              avatarUrl: null,
              skillLevel: 'kettle_pro',
            },
          },
        ],
        total: 1,
        page: 1,
        limit: 12,
        totalPages: 1,
        hasMore: false,
      };

      const fetchSpy = jest.fn().mockResolvedValue({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => mockFollowingResponse,
      });
      global.fetch = fetchSpy;

      const res = await apiClient.experiments.followingFeed({
        page: 1,
        limit: 12,
        sort: 'recent',
        difficulty: 'easy',
        rootOnly: true,
        search: 'Maggi',
      });

      expect(fetchSpy).toHaveBeenCalledTimes(1);
      const [url, options] = fetchSpy.mock.calls[0];
      expect(url).toContain('/experiments/feed/following');
      expect(url).toContain('page=1');
      expect(url).toContain('limit=12');
      expect(url).toContain('sort=recent');
      expect(url).toContain('difficulty=easy');
      expect(url).toContain('rootOnly=true');
      expect(url).toContain('search=Maggi');
      expect(options.headers).toMatchObject({
        Authorization: 'Bearer test-following-feed-token',
      });

      expect(res.items.length).toBe(1);
      expect(res.items[0].creator?.username).toBe('wing_cook');
      expect(res.total).toBe(1);
      expect(res.hasMore).toBe(false);
    });

    it('should handle empty feed when user follows nobody or no experiments match', async () => {
      const mockEmptyResponse = {
        items: [],
        total: 0,
        page: 1,
        limit: 12,
        totalPages: 0,
        hasMore: false,
      };

      const fetchSpy = jest.fn().mockResolvedValue({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => mockEmptyResponse,
      });
      global.fetch = fetchSpy;

      const res = await apiClient.experiments.followingFeed({
        page: 1,
        limit: 12,
      });

      expect(res.items).toEqual([]);
      expect(res.total).toBe(0);
      expect(res.hasMore).toBe(false);
    });

    it('should throw ApiError with 401 when caller is unauthenticated', async () => {
      apiClient.setToken(null);

      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({
          statusCode: 401,
          message: 'Unauthorized',
        }),
      });

      await expect(apiClient.experiments.followingFeed()).rejects.toThrow(ApiError);
    });
  });
});
