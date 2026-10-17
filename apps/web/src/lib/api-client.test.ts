import { ApiError, apiClient } from './api-client';
import { formatCostRange, formatIndianCurrency, DIFFICULTY_THEMES } from './tokens';
import { getApiBaseUrl, getHealthUrl } from './config';

describe('Frontend API Client & Foundation Tokens', () => {
  beforeEach(() => {
    apiClient.setToken(null);
    jest.restoreAllMocks();
  });

  describe('Environment Configuration', () => {
    it('should derive clean API base URL without trailing slash', () => {
      expect(getApiBaseUrl()).not.toMatch(/\/$/);
      expect(getHealthUrl()).not.toMatch(/\/$/);
    });
  });

  describe('Tokens & Formatting', () => {
    it('should format Indian currency appropriately', () => {
      expect(formatIndianCurrency(50)).toBe('₹50');
      expect(formatIndianCurrency(null)).toBe('₹--');
      expect(formatIndianCurrency(undefined)).toBe('₹--');
    });

    it('should format cost ranges for student budgets', () => {
      expect(formatCostRange({ min: 30, max: 60, currency: 'INR' })).toBe('₹30 - ₹60');
      expect(formatCostRange({ min: 50, max: 50, currency: 'INR' })).toBe('₹50');
      expect(formatCostRange(null)).toBe('Budget Friendly');
    });

    it('should define hostel difficulty themes with proper badges', () => {
      expect(DIFFICULTY_THEMES.easy.label).toContain('Hostel Quickie');
      expect(DIFFICULTY_THEMES.medium.label).toContain('Kettle Pro');
      expect(DIFFICULTY_THEMES.hard.label).toContain('Maniac Masterpiece');
    });
  });

  describe('WierdApiClient Error & Token Handling', () => {
    it('should store and clear authentication tokens', () => {
      apiClient.setToken('test-jwt-token-123');
      expect(apiClient.getToken()).toBe('test-jwt-token-123');

      apiClient.auth.logout();
      expect(apiClient.getToken()).toBeNull();
    });

    it('should wrap API errors in ApiError with statusCode', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 404,
        statusText: 'Not Found',
        json: async () => ({ message: 'Experiment not found in Living Food Graph' }),
      });

      await expect(apiClient.experiments.get('nonexistent-id')).rejects.toThrow(ApiError);
      await expect(apiClient.experiments.get('nonexistent-id')).rejects.toMatchObject({
        statusCode: 404,
        message: 'Experiment not found in Living Food Graph',
      });
    });

    it('should pass Authorization header when token is set', async () => {
      apiClient.setToken('auth-token-xyz');

      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          id: 'user-1',
          username: 'chef_raj',
          email: 'raj@hostel.edu',
          displayName: 'Chef Raj',
        }),
      });

      await apiClient.auth.me();

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/auth/me'),
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer auth-token-xyz',
          }),
        }),
      );
    });

    it('should serialize query params for experiment feed discovery', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          data: [],
          pagination: { total: 0, limit: 10, hasMore: false },
        }),
      });

      await apiClient.experiments.list({
        limit: 10,
        sort: 'trending',
        difficulty: 'easy',
        search: 'maggi',
        rootOnly: true,
      });

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringMatching(
          /\/experiments\?limit=10&sort=trending&difficulty=easy&search=maggi&rootOnly=true$/,
        ),
        expect.anything(),
      );
    });
  });
});
