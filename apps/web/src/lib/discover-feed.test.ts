import { apiClient, ApiError } from './api-client';
import { FEED_SORT_OPTIONS, BRANCH_OPTIONS, DIFFICULTY_OPTIONS } from './feed-constants';

describe('Discover Social Food Feed & Filtering Integration', () => {
  beforeEach(() => {
    jest.restoreAllMocks();
  });

  describe('Feed Configuration Constants', () => {
    it('should support all 5 backend sort modes', () => {
      const sortIds = FEED_SORT_OPTIONS.map((opt) => opt.id);
      expect(sortIds).toEqual(['trending', 'recent', 'remixes', 'cooks', 'votes']);
    });

    it('should support all branch filters (all, roots, remixes)', () => {
      const branchIds = BRANCH_OPTIONS.map((opt) => opt.id);
      expect(branchIds).toEqual(['all', 'roots', 'remixes']);
    });

    it('should support standard difficulty tiers (all, easy, medium, hard)', () => {
      const diffIds = DIFFICULTY_OPTIONS.map((opt) => opt.id);
      expect(diffIds).toEqual(['all', 'easy', 'medium', 'hard']);
    });
  });

  describe('apiClient.experiments.list', () => {
    const mockFeedResponse = {
      items: [
        {
          id: 'exp-001',
          title: 'Midnight Hostel Egg Maggi',
          description: 'Hostel classic with poached egg and chilli flakes.',
          difficulty: 'easy',
          branchDepth: 0,
          parentId: null,
          rootId: null,
          remixCount: 4,
          cookCount: 12,
          voteCount: 38,
          resultCount: 5,
          createdAt: '2026-10-17T10:00:00Z',
          creator: {
            id: 'user-001',
            username: 'hostelchef',
            displayName: 'Hostel Chef',
            skillLevel: 'kettle_warrior',
          },
          ingredients: [
            { id: 'ing-1', name: 'Maggi', quantity: 1, unit: 'packet', isOptional: false },
          ],
        },
      ],
      total: 25,
      page: 1,
      limit: 12,
      totalPages: 3,
      hasMore: true,
    };

    it('should fetch default feed with no parameters when options are empty', async () => {
      const fetchSpy = jest.fn().mockResolvedValue({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => mockFeedResponse,
      });
      global.fetch = fetchSpy;

      const res = await apiClient.experiments.list();

      expect(fetchSpy).toHaveBeenCalledTimes(1);
      const [url] = fetchSpy.mock.calls[0];
      expect(url).toContain('/api/v1/experiments');
      expect(res.items.length).toBe(1);
      expect(res.data?.length).toBe(1);
      expect(res.total).toBe(25);
      expect(res.hasMore).toBe(true);
    });

    it('should pass sort modes accurately (trending, recent, remixes, cooks, votes)', async () => {
      const sortModes = ['trending', 'recent', 'remixes', 'cooks', 'votes'] as const;

      for (const sort of sortModes) {
        const fetchSpy = jest.fn().mockResolvedValue({
          ok: true,
          status: 200,
          headers: new Headers({ 'content-type': 'application/json' }),
          json: async () => mockFeedResponse,
        });
        global.fetch = fetchSpy;

        await apiClient.experiments.list({ sort });

        const [url] = fetchSpy.mock.calls[0];
        expect(url).toContain(`sort=${sort}`);
      }
    });

    it('should accurately encode difficulty filter, ignoring "all"', async () => {
      const fetchSpy = jest.fn().mockResolvedValue({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => mockFeedResponse,
      });
      global.fetch = fetchSpy;

      await apiClient.experiments.list({ difficulty: 'easy' });
      expect(fetchSpy.mock.calls[0][0]).toContain('difficulty=easy');

      fetchSpy.mockClear();
      await apiClient.experiments.list({ difficulty: 'all' as any });
      expect(fetchSpy.mock.calls[0][0]).not.toContain('difficulty=all');
    });

    it('should filter by root-only or remixes via rootOnly boolean', async () => {
      const fetchSpy = jest.fn().mockResolvedValue({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => mockFeedResponse,
      });
      global.fetch = fetchSpy;

      // Root originals
      await apiClient.experiments.list({ rootOnly: true });
      expect(fetchSpy.mock.calls[0][0]).toContain('rootOnly=true');

      fetchSpy.mockClear();
      // Remix branches
      await apiClient.experiments.list({ rootOnly: false });
      expect(fetchSpy.mock.calls[0][0]).toContain('rootOnly=false');
    });

    it('should filter by canonical ingredient ID', async () => {
      const fetchSpy = jest.fn().mockResolvedValue({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => mockFeedResponse,
      });
      global.fetch = fetchSpy;

      const ingredientUuid = '11111111-2222-3333-4444-555555555555';
      await apiClient.experiments.list({ canonicalIngredientId: ingredientUuid });

      expect(fetchSpy.mock.calls[0][0]).toContain(`canonicalIngredientId=${ingredientUuid}`);
    });

    it('should include debounced search term', async () => {
      const fetchSpy = jest.fn().mockResolvedValue({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => mockFeedResponse,
      });
      global.fetch = fetchSpy;

      await apiClient.experiments.list({ search: 'chilli maggi' });
      expect(fetchSpy.mock.calls[0][0]).toContain('search=chilli+maggi');
    });

    it('should support pagination with page and limit', async () => {
      const fetchSpy = jest.fn().mockResolvedValue({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({
          ...mockFeedResponse,
          page: 2,
          limit: 12,
        }),
      });
      global.fetch = fetchSpy;

      const res = await apiClient.experiments.list({ page: 2, limit: 12 });

      expect(fetchSpy.mock.calls[0][0]).toContain('page=2');
      expect(fetchSpy.mock.calls[0][0]).toContain('limit=12');
      expect(res.page).toBe(2);
      expect(res.limit).toBe(12);
    });

    it('should handle empty feed response gracefully', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({
          items: [],
          total: 0,
          page: 1,
          limit: 12,
          totalPages: 0,
          hasMore: false,
        }),
      });

      const res = await apiClient.experiments.list({ search: 'nonexistent-concoction' });

      expect(res.items).toEqual([]);
      expect(res.data).toEqual([]);
      expect(res.total).toBe(0);
      expect(res.hasMore).toBe(false);
    });

    it('should throw ApiError with backend status when discovery endpoint fails', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({
          message: 'Database query timed out',
          statusCode: 500,
        }),
      });

      await expect(apiClient.experiments.list()).rejects.toThrow(ApiError);
      await expect(apiClient.experiments.list()).rejects.toMatchObject({
        statusCode: 500,
        message: 'Database query timed out',
      });
    });
  });
});
