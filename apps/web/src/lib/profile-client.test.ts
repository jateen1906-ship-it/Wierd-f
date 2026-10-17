import { apiClient, ApiError } from './api-client';

describe('User Profile & Activity API Client Methods (/users/me/*)', () => {
  beforeEach(() => {
    apiClient.setToken('test-jwt-profile-token');
    jest.restoreAllMocks();
  });

  afterEach(() => {
    apiClient.setToken(null);
  });

  describe('apiClient.users.myExperiments', () => {
    it('should query /users/me/experiments with pagination and auth headers', async () => {
      const mockResponse = {
        items: [
          {
            id: 'exp-user-1',
            title: 'My Late Night Butter Maggi',
            description: 'My personal hostel recipe.',
            difficulty: 'easy',
            branchDepth: 0,
            remixCount: 2,
            cookCount: 5,
            voteCount: 12,
            resultCount: 3,
            createdAt: '2026-10-17T12:00:00Z',
          },
        ],
        total: 1,
        page: 1,
        limit: 10,
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

      const res = await apiClient.users.myExperiments(1, 10);

      expect(fetchSpy).toHaveBeenCalledTimes(1);
      const [url, options] = fetchSpy.mock.calls[0];
      expect(url).toContain('/users/me/experiments?page=1&limit=10');
      expect(options.headers).toMatchObject({
        Authorization: 'Bearer test-jwt-profile-token',
      });
      expect(res.items.length).toBe(1);
      expect(res.items[0].title).toBe('My Late Night Butter Maggi');
      expect(res.total).toBe(1);
    });

    it('should throw ApiError on 401 unauthorized', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({
          message: 'Unauthorized',
          statusCode: 401,
        }),
      });

      await expect(apiClient.users.myExperiments()).rejects.toThrow(ApiError);
    });
  });

  describe('apiClient.users.myCookingResults', () => {
    it('should query /users/me/cooking-results with pagination and auth headers', async () => {
      const mockResponse = {
        items: [
          {
            id: 'proof-user-1',
            experimentId: 'exp-001',
            outcomeTag: 'perfection',
            caption: 'Turned out amazing!',
            tasteRating: 5,
            wouldMakeAgain: true,
            likesCount: 7,
            createdAt: '2026-10-17T14:00:00Z',
            media: [{ id: 'm-1', url: 'https://example.com/food.jpg', type: 'image' }],
          },
        ],
        total: 1,
        page: 1,
        limit: 10,
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

      const res = await apiClient.users.myCookingResults(1, 10);

      expect(fetchSpy).toHaveBeenCalledTimes(1);
      const [url] = fetchSpy.mock.calls[0];
      expect(url).toContain('/users/me/cooking-results?page=1&limit=10');
      expect(res.items[0].outcomeTag).toBe('perfection');
    });
  });

  describe('apiClient.users.myVotes', () => {
    it('should query /users/me/votes and return user vote history', async () => {
      const mockResponse = {
        items: [
          {
            id: 'vote-user-1',
            experimentId: 'exp-100',
            choice: 'would_try',
            createdAt: '2026-10-17T15:00:00Z',
            experiment: {
              id: 'exp-100',
              title: 'Espresso Instant Ramen',
            },
          },
        ],
        total: 1,
        page: 1,
        limit: 10,
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

      const res = await apiClient.users.myVotes(1, 10);

      expect(fetchSpy).toHaveBeenCalledTimes(1);
      const [url] = fetchSpy.mock.calls[0];
      expect(url).toContain('/users/me/votes?page=1&limit=10');
      expect(res.items[0].choice).toBe('would_try');
      expect(res.items[0].experiment?.title).toBe('Espresso Instant Ramen');
    });
  });

  describe('apiClient.users.myReactions', () => {
    it('should query /users/me/reactions and return user reaction history', async () => {
      const mockResponse = {
        items: [
          {
            id: 'react-user-1',
            resultId: 'result-500',
            type: 'fire',
            createdAt: '2026-10-17T16:00:00Z',
            result: {
              id: 'result-500',
              experimentId: 'exp-500',
              outcomeTag: 'flavor_bomb',
              caption: 'Pure chaos but tastes great',
            },
          },
        ],
        total: 1,
        page: 1,
        limit: 10,
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

      const res = await apiClient.users.myReactions(1, 10);

      expect(fetchSpy).toHaveBeenCalledTimes(1);
      const [url] = fetchSpy.mock.calls[0];
      expect(url).toContain('/users/me/reactions?page=1&limit=10');
      expect(res.items[0].type).toBe('fire');
      expect(res.items[0].result?.outcomeTag).toBe('flavor_bomb');
    });
  });
});
