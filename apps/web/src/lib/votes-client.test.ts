import { apiClient, ApiError, type VoteChoice } from './api-client';

describe('Community Votes API Client', () => {
  const experimentId = 'exp-sample-123';

  beforeEach(() => {
    apiClient.setToken('test-user-auth-jwt');
    jest.restoreAllMocks();
  });

  afterEach(() => {
    apiClient.setToken(null);
  });

  describe('apiClient.votes.getSummary', () => {
    it('should retrieve aggregate vote summary with user vote when authenticated', async () => {
      const mockSummary = {
        experimentId,
        wouldTryCount: 15,
        passCount: 3,
        totalVotes: 18,
        userVote: 'would_try' as const,
      };

      const fetchSpy = jest.fn().mockResolvedValue({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => mockSummary,
      });
      global.fetch = fetchSpy;

      const result = await apiClient.votes.getSummary(experimentId);

      expect(fetchSpy).toHaveBeenCalledTimes(1);
      const [url, options] = fetchSpy.mock.calls[0];
      expect(url).toContain(`/experiments/${experimentId}/votes`);
      expect(options.headers).toMatchObject({
        Authorization: 'Bearer test-user-auth-jwt',
      });
      expect(result).toEqual(mockSummary);
      expect(result.wouldTryCount).toBe(15);
      expect(result.userVote).toBe('would_try');
    });

    it('should retrieve vote summary without user vote when caller has not voted', async () => {
      const mockSummary = {
        experimentId,
        wouldTryCount: 0,
        passCount: 0,
        totalVotes: 0,
      };

      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => mockSummary,
      });

      const result = await apiClient.votes.getSummary(experimentId);
      expect(result.totalVotes).toBe(0);
      expect(result.userVote).toBeUndefined();
    });
  });

  describe('apiClient.votes.cast', () => {
    it('should cast a "would_try" vote via POST /experiments/:id/votes', async () => {
      const mockVoteResponse = {
        id: 'vote-001',
        userId: 'user-789',
        experimentId,
        choice: 'would_try' as VoteChoice,
        createdAt: '2026-10-17T12:00:00Z',
        updatedAt: '2026-10-17T12:00:00Z',
      };

      const fetchSpy = jest.fn().mockResolvedValue({
        ok: true,
        status: 201,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => mockVoteResponse,
      });
      global.fetch = fetchSpy;

      const result = await apiClient.votes.cast(experimentId, 'would_try');

      expect(fetchSpy).toHaveBeenCalledTimes(1);
      const [url, options] = fetchSpy.mock.calls[0];
      expect(url).toContain(`/experiments/${experimentId}/votes`);
      expect(options.method).toBe('POST');
      expect(options.headers).toMatchObject({
        'Content-Type': 'application/json',
        Authorization: 'Bearer test-user-auth-jwt',
      });
      expect(JSON.parse(options.body)).toEqual({ choice: 'would_try' });
      expect(result.choice).toBe('would_try');
    });

    it('should update an existing vote to "pass"', async () => {
      const mockUpdatedVote = {
        id: 'vote-001',
        userId: 'user-789',
        experimentId,
        choice: 'pass' as VoteChoice,
        createdAt: '2026-10-17T12:00:00Z',
        updatedAt: '2026-10-17T12:05:00Z',
      };

      const fetchSpy = jest.fn().mockResolvedValue({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => mockUpdatedVote,
      });
      global.fetch = fetchSpy;

      const result = await apiClient.votes.cast(experimentId, 'pass');
      expect(JSON.parse(fetchSpy.mock.calls[0][1].body)).toEqual({ choice: 'pass' });
      expect(result.choice).toBe('pass');
    });

    it('should throw ApiError with 401 Unauthorized if token is absent or invalid', async () => {
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

      await expect(apiClient.votes.cast(experimentId, 'would_try')).rejects.toThrow(ApiError);
      await expect(apiClient.votes.cast(experimentId, 'would_try')).rejects.toMatchObject({
        statusCode: 401,
        message: 'Unauthorized',
      });
    });
  });

  describe('apiClient.votes.remove', () => {
    it('should remove the user vote via DELETE /experiments/:id/votes', async () => {
      const mockDeleteResponse = {
        success: true,
        message: 'Vote removed successfully',
      };

      const fetchSpy = jest.fn().mockResolvedValue({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => mockDeleteResponse,
      });
      global.fetch = fetchSpy;

      const result = await apiClient.votes.remove(experimentId);

      expect(fetchSpy).toHaveBeenCalledTimes(1);
      const [url, options] = fetchSpy.mock.calls[0];
      expect(url).toContain(`/experiments/${experimentId}/votes`);
      expect(options.method).toBe('DELETE');
      expect(result.success).toBe(true);
    });

    it('should throw ApiError with 404 if no vote exists to delete', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 404,
        statusText: 'Not Found',
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({
          statusCode: 404,
          message: `Vote not found for experiment ${experimentId}`,
        }),
      });

      await expect(apiClient.votes.remove(experimentId)).rejects.toMatchObject({
        statusCode: 404,
        message: `Vote not found for experiment ${experimentId}`,
      });
    });
  });
});
