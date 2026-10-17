import { apiClient, ApiError } from './api-client';

describe('Creator Follow System API Client & Privacy', () => {
  beforeEach(() => {
    jest.restoreAllMocks();
    apiClient.setToken('test-follow-token');
  });

  afterEach(() => {
    apiClient.setToken(null);
  });

  describe('apiClient.users.follow', () => {
    it('should send POST /users/:username/follow with authorization header', async () => {
      const mockFollowResponse = {
        success: true,
        isFollowing: true,
        followersCount: 11,
      };

      const fetchSpy = jest.fn().mockResolvedValue({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => mockFollowResponse,
      });
      global.fetch = fetchSpy;

      const res = await apiClient.users.follow('spice_master');

      expect(fetchSpy).toHaveBeenCalledTimes(1);
      const [url, options] = fetchSpy.mock.calls[0];
      expect(url).toContain('/users/spice_master/follow');
      expect(options.method).toBe('POST');
      expect(options.headers).toMatchObject({
        Authorization: 'Bearer test-follow-token',
      });
      expect(res.isFollowing).toBe(true);
      expect(res.followersCount).toBe(11);
    });

    it('should throw ApiError with 400 when attempting self-follow', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 400,
        statusText: 'Bad Request',
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({
          statusCode: 400,
          message: 'You cannot follow yourself',
          error: 'Bad Request',
        }),
      });

      await expect(apiClient.users.follow('self_username')).rejects.toMatchObject({
        statusCode: 400,
        message: 'You cannot follow yourself',
      });
    });
  });

  describe('apiClient.users.unfollow', () => {
    it('should send DELETE /users/:username/follow with authorization header', async () => {
      const mockUnfollowResponse = {
        success: true,
        isFollowing: false,
        followersCount: 10,
      };

      const fetchSpy = jest.fn().mockResolvedValue({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => mockUnfollowResponse,
      });
      global.fetch = fetchSpy;

      const res = await apiClient.users.unfollow('spice_master');

      expect(fetchSpy).toHaveBeenCalledTimes(1);
      const [url, options] = fetchSpy.mock.calls[0];
      expect(url).toContain('/users/spice_master/follow');
      expect(options.method).toBe('DELETE');
      expect(options.headers).toMatchObject({
        Authorization: 'Bearer test-follow-token',
      });
      expect(res.isFollowing).toBe(false);
      expect(res.followersCount).toBe(10);
    });
  });

  describe('apiClient.users.myFollowing', () => {
    it('should query /users/me/following with pagination parameters', async () => {
      const mockFollowingResponse = {
        items: [
          {
            id: 'creator-1',
            username: 'spice_master',
            displayName: 'Spice Master',
            avatarUrl: null,
            skillLevel: 'kettle_pro',
            bio: 'Street spices in hostel pots',
            followedAt: '2026-10-17T12:00:00Z',
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
        json: async () => mockFollowingResponse,
      });
      global.fetch = fetchSpy;

      const res = await apiClient.users.myFollowing(1, 10);

      expect(fetchSpy).toHaveBeenCalledTimes(1);
      const [url] = fetchSpy.mock.calls[0];
      expect(url).toContain('/users/me/following?page=1&limit=10');
      expect(res.items.length).toBe(1);
      expect(res.items[0].username).toBe('spice_master');
      expect(res.total).toBe(1);
    });
  });

  describe('Public Profile Follow Counts & Privacy Verification', () => {
    it('should include followersCount, followingCount, and isFollowing in public profile without leaking private fields', async () => {
      const mockProfileWithFollowers = {
        id: 'usr-888',
        username: 'gourmet_hosteler',
        displayName: 'Gourmet Hosteler',
        avatarUrl: null,
        bio: 'Hostel connoisseur',
        skillLevel: 'fermentation_nerd',
        createdAt: '2026-02-01T00:00:00Z',
        stats: {
          experimentsCount: 5,
          cookingResultsCount: 8,
          remixesCount: 2,
          followersCount: 42,
          followingCount: 15,
        },
        isFollowing: true,
      };

      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => mockProfileWithFollowers,
      });

      const profile = await apiClient.users.getPublicProfile('gourmet_hosteler');

      expect(profile.stats.followersCount).toBe(42);
      expect(profile.stats.followingCount).toBe(15);
      expect(profile.isFollowing).toBe(true);

      // Verify privacy guarantee: No private user data leaked
      const profileAny = profile as unknown as Record<string, unknown>;
      expect(profileAny.email).toBeUndefined();
      expect(profileAny.passwordHash).toBeUndefined();
      expect(profileAny.preferences).toBeUndefined();
      expect(profileAny.votes).toBeUndefined();
      expect(profileAny.resultReactions).toBeUndefined();
    });
  });
});
