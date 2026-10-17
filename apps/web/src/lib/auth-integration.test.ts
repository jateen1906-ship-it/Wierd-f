import { apiClient, ApiError } from './api-client';

describe('Authentication Client & Session Integration', () => {
  beforeEach(() => {
    apiClient.setToken(null);
    apiClient.onUnauthorized = undefined;
    jest.restoreAllMocks();
  });

  describe('Login Flow', () => {
    it('should post credentials to /auth/login, persist token, and return user profile', async () => {
      const mockAuthResponse = {
        accessToken: 'jwt-access-token-abc',
        user: {
          id: 'usr-101',
          username: 'maggi_cook',
          displayName: 'Maggi Cook',
          email: 'maggi@hostel.edu',
          bio: null,
          avatarUrl: null,
          skillLevel: 'beginner',
          createdAt: '2026-10-17T12:00:00.000Z',
        },
      };

      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => mockAuthResponse,
      });

      const res = await apiClient.auth.login({
        email: 'maggi@hostel.edu',
        password: 'Password123!',
      });

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/auth/login'),
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({
            email: 'maggi@hostel.edu',
            password: 'Password123!',
          }),
        }),
      );

      expect(res.accessToken).toBe('jwt-access-token-abc');
      expect(res.user.username).toBe('maggi_cook');
      expect(apiClient.getToken()).toBe('jwt-access-token-abc');
    });

    it('should throw ApiError with 401 when invalid credentials are provided', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
        json: async () => ({ message: 'Invalid email or password' }),
      });

      await expect(
        apiClient.auth.login({
          email: 'wrong@hostel.edu',
          password: 'WrongPassword!',
        }),
      ).rejects.toMatchObject({
        statusCode: 401,
        message: 'Invalid email or password',
      });

      expect(apiClient.getToken()).toBeNull();
    });
  });

  describe('Registration Flow', () => {
    it('should post payload to /auth/register, store token, and return created user', async () => {
      const mockRegisterResponse = {
        accessToken: 'jwt-registered-token-xyz',
        user: {
          id: 'usr-202',
          username: 'chai_innovator',
          displayName: 'Chai Innovator',
          email: 'chai@hostel.edu',
          bio: null,
          avatarUrl: null,
          skillLevel: 'beginner',
          createdAt: '2026-10-17T12:05:00.000Z',
        },
      };

      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        status: 201,
        json: async () => mockRegisterResponse,
      });

      const res = await apiClient.auth.register({
        username: 'chai_innovator',
        displayName: 'Chai Innovator',
        email: 'chai@hostel.edu',
        password: 'Password123!',
      });

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/auth/register'),
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({
            username: 'chai_innovator',
            displayName: 'Chai Innovator',
            email: 'chai@hostel.edu',
            password: 'Password123!',
          }),
        }),
      );

      expect(res.accessToken).toBe('jwt-registered-token-xyz');
      expect(apiClient.getToken()).toBe('jwt-registered-token-xyz');
    });

    it('should throw ApiError with 409 when email or username is already taken', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 409,
        statusText: 'Conflict',
        json: async () => ({ message: 'An account with this email address already exists' }),
      });

      await expect(
        apiClient.auth.register({
          username: 'existing_chef',
          email: 'existing@hostel.edu',
          password: 'Password123!',
        }),
      ).rejects.toMatchObject({
        statusCode: 409,
        message: 'An account with this email address already exists',
      });
    });
  });

  describe('Session Profile & 401 Expiration Handling', () => {
    it('should fetch user profile from /auth/me with Bearer token', async () => {
      apiClient.setToken('valid-active-token');

      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          id: 'usr-101',
          username: 'maggi_cook',
          displayName: 'Maggi Cook',
          email: 'maggi@hostel.edu',
          bio: null,
          avatarUrl: null,
          skillLevel: 'beginner',
          createdAt: '2026-10-17T12:00:00.000Z',
          preferences: null,
        }),
      });

      const profile = await apiClient.auth.me();
      expect(profile.username).toBe('maggi_cook');
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/auth/me'),
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer valid-active-token',
          }),
        }),
      );
    });

    it('should trigger onUnauthorized callback when server returns 401 for an authenticated call', async () => {
      apiClient.setToken('expired-or-revoked-token');
      const unauthorizedListener = jest.fn();
      apiClient.onUnauthorized = unauthorizedListener;

      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
        json: async () => ({ message: 'Unauthorized' }),
      });

      await expect(apiClient.auth.me()).rejects.toThrow(ApiError);
      expect(unauthorizedListener).toHaveBeenCalledTimes(1);
    });

    it('should clear stored session on logout', () => {
      apiClient.setToken('token-to-be-cleared');
      expect(apiClient.getToken()).toBe('token-to-be-cleared');

      apiClient.auth.logout();
      expect(apiClient.getToken()).toBeNull();
    });

    it('should throw ApiError with status 0 on network connection failure', async () => {
      global.fetch = jest.fn().mockRejectedValue(new Error('Failed to fetch from backend'));

      await expect(apiClient.auth.me()).rejects.toMatchObject({
        statusCode: 0,
        message: 'Failed to fetch from backend',
      });
    });
  });
});
