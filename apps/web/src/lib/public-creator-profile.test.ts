import { apiClient, ApiError } from './api-client';

describe('Public Creator Profile API Client & Privacy Contract', () => {
  beforeEach(() => {
    jest.restoreAllMocks();
    apiClient.setToken(null);
  });

  describe('apiClient.users.getPublicProfile', () => {
    it('should query /users/:username and return public creator profile with stats', async () => {
      const mockPublicProfile = {
        id: 'usr-uuid-1234',
        username: 'late_night_chef',
        displayName: 'Late Night Chef',
        avatarUrl: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2',
        bio: 'Cooking gourmet Maggi on a hostel kettle since 2024.',
        skillLevel: 'kettle_pro',
        createdAt: '2026-01-15T10:00:00.000Z',
        stats: {
          experimentsCount: 8,
          cookingResultsCount: 14,
          remixesCount: 5,
        },
      };

      const fetchSpy = jest.fn().mockResolvedValue({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => mockPublicProfile,
      });
      global.fetch = fetchSpy;

      const profile = await apiClient.users.getPublicProfile('late_night_chef');

      expect(fetchSpy).toHaveBeenCalledTimes(1);
      const [url, options] = fetchSpy.mock.calls[0];
      expect(url).toContain('/users/late_night_chef');
      // Should not have Authorization header when unauthenticated visitor
      expect(options.headers).not.toHaveProperty('Authorization');

      // Verify public fields exist
      expect(profile.id).toBe('usr-uuid-1234');
      expect(profile.username).toBe('late_night_chef');
      expect(profile.displayName).toBe('Late Night Chef');
      expect(profile.skillLevel).toBe('kettle_pro');
      expect(profile.stats.experimentsCount).toBe(8);
      expect(profile.stats.cookingResultsCount).toBe(14);
      expect(profile.stats.remixesCount).toBe(5);

      // CRITICAL PRIVACY CHECKS: Ensure no private information is exposed
      const profileAny = profile as unknown as Record<string, unknown>;
      expect(profileAny.email).toBeUndefined();
      expect(profileAny.passwordHash).toBeUndefined();
      expect(profileAny.preferences).toBeUndefined();
      expect(profileAny.votes).toBeUndefined();
      expect(profileAny.resultReactions).toBeUndefined();
    });

    it('should properly URL-encode usernames with special characters', async () => {
      const fetchSpy = jest.fn().mockResolvedValue({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({
          id: 'usr-2',
          username: 'chef-with_dashes',
          displayName: 'Dashed Chef',
          avatarUrl: null,
          bio: null,
          skillLevel: 'novice',
          createdAt: '2026-03-01T00:00:00Z',
          stats: { experimentsCount: 0, cookingResultsCount: 0, remixesCount: 0 },
        }),
      });
      global.fetch = fetchSpy;

      await apiClient.users.getPublicProfile('chef-with_dashes');
      const [url] = fetchSpy.mock.calls[0];
      expect(url).toContain('/users/chef-with_dashes');
    });

    it('should throw ApiError with 404 status when user is not found', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 404,
        statusText: 'Not Found',
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({
          statusCode: 404,
          message: 'Creator with username nonexistent_chef not found',
          error: 'Not Found',
        }),
      });

      await expect(apiClient.users.getPublicProfile('nonexistent_chef')).rejects.toMatchObject({
        statusCode: 404,
        message: 'Creator with username nonexistent_chef not found',
      });
    });
  });

  describe('apiClient.experiments.list with creatorUsername', () => {
    it('should query /experiments with creatorUsername query parameter', async () => {
      const mockExperimentsResponse = {
        items: [
          {
            id: 'exp-101',
            title: 'Hostel Hot Sauce Pasta',
            description: 'Cooked in electric kettle with peri-peri mix.',
            difficulty: 'easy',
            branchDepth: 0,
            remixCount: 3,
            cookCount: 9,
            voteCount: 22,
            resultCount: 4,
            createdAt: '2026-02-10T08:00:00Z',
            creator: {
              id: 'usr-uuid-1234',
              username: 'late_night_chef',
              displayName: 'Late Night Chef',
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
        json: async () => mockExperimentsResponse,
      });
      global.fetch = fetchSpy;

      const res = await apiClient.experiments.list({
        creatorUsername: 'late_night_chef',
        page: 1,
        limit: 12,
        sort: 'recent',
      });

      expect(fetchSpy).toHaveBeenCalledTimes(1);
      const [url] = fetchSpy.mock.calls[0];
      expect(url).toContain('creatorUsername=late_night_chef');
      expect(url).toContain('page=1');
      expect(url).toContain('limit=12');
      expect(url).toContain('sort=recent');

      expect(res.items.length).toBe(1);
      expect(res.items[0].creator?.username).toBe('late_night_chef');
    });

    it('should include rootOnly filter parameter when specified for creator experiments', async () => {
      const fetchSpy = jest.fn().mockResolvedValue({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({
          items: [],
          total: 0,
          page: 1,
          limit: 12,
          totalPages: 1,
          hasMore: false,
        }),
      });
      global.fetch = fetchSpy;

      await apiClient.experiments.list({
        creatorUsername: 'late_night_chef',
        rootOnly: true,
      });

      const [urlRoots] = fetchSpy.mock.calls[0];
      expect(urlRoots).toContain('creatorUsername=late_night_chef');
      expect(urlRoots).toContain('rootOnly=true');

      await apiClient.experiments.list({
        creatorUsername: 'late_night_chef',
        rootOnly: false,
      });

      const [urlRemixes] = fetchSpy.mock.calls[1];
      expect(urlRemixes).toContain('creatorUsername=late_night_chef');
      expect(urlRemixes).toContain('rootOnly=false');
    });
  });
});
