import {
  apiClient,
  ApiError,
  type CreateCookingResultInput,
  type ResultReactionType,
} from './api-client';

describe('Cooking Results & Reactions API Client', () => {
  const experimentId = 'exp-sample-456';
  const resultId = 'result-sample-789';

  beforeEach(() => {
    apiClient.setToken('test-auth-jwt-token');
    jest.restoreAllMocks();
  });

  afterEach(() => {
    apiClient.setToken(null);
  });

  describe('apiClient.cookingResults.create', () => {
    it('should submit valid proof payload to POST /cooking-results with auth header', async () => {
      const mockResultResponse = {
        id: 'new-result-001',
        experimentId,
        userId: 'user-001',
        media: [
          {
            id: 'proof-1',
            url: 'https://images.unsplash.com/photo-1569718212165',
            type: 'image',
          },
        ],
        caption: 'Late night kettle success',
        outcomeTag: 'perfection',
        tasteRating: 5,
        textureRating: 4,
        wouldMakeAgain: true,
        modificationsMade: 'Added extra garlic',
        likesCount: 0,
        createdAt: '2026-10-17T12:00:00Z',
        updatedAt: '2026-10-17T12:00:00Z',
      };

      const fetchSpy = jest.fn().mockResolvedValue({
        ok: true,
        status: 201,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => mockResultResponse,
      });
      global.fetch = fetchSpy;

      const payload: CreateCookingResultInput = {
        experimentId,
        media: [
          {
            id: 'proof-1',
            url: 'https://images.unsplash.com/photo-1569718212165',
            type: 'image',
          },
        ],
        caption: 'Late night kettle success',
        outcomeTag: 'perfection',
        tasteRating: 5,
        textureRating: 4,
        wouldMakeAgain: true,
        modificationsMade: 'Added extra garlic',
      };

      const res = await apiClient.cookingResults.create(payload);

      expect(fetchSpy).toHaveBeenCalledTimes(1);
      const [url, options] = fetchSpy.mock.calls[0];
      expect(url).toContain('/cooking-results');
      expect(options.method).toBe('POST');
      expect(options.headers).toMatchObject({
        'Content-Type': 'application/json',
        Authorization: 'Bearer test-auth-jwt-token',
      });
      expect(res.id).toBe('new-result-001');
      expect(res.outcomeTag).toBe('perfection');
    });

    it('should throw ApiError with backend validation message on failure', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 400,
        statusText: 'Bad Request',
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({
          statusCode: 400,
          message: 'At least 1 photo/video proof is required',
        }),
      });

      await expect(
        apiClient.cookingResults.create({
          experimentId,
          media: [],
          outcomeTag: 'total_chaos',
          tasteRating: 1,
          wouldMakeAgain: false,
        }),
      ).rejects.toMatchObject({
        statusCode: 400,
        message: 'At least 1 photo/video proof is required',
      });
    });
  });

  describe('apiClient.cookingResults.listByExperiment', () => {
    it('should retrieve paginated cooking results from /experiments/:id/cooking-results', async () => {
      const mockPaginated = {
        items: [
          {
            id: 'res-1',
            experimentId,
            userId: 'user-1',
            caption: 'First proof',
            outcomeTag: 'flavor_bomb',
            tasteRating: 4,
            likesCount: 2,
            wouldMakeAgain: true,
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
        json: async () => mockPaginated,
      });
      global.fetch = fetchSpy;

      const res = await apiClient.cookingResults.listByExperiment(experimentId, 1, 20);

      expect(fetchSpy).toHaveBeenCalledWith(
        expect.stringContaining(`/experiments/${experimentId}/cooking-results?page=1&limit=20`),
        expect.anything(),
      );
      expect(res.items.length).toBe(1);
      expect(res.items[0].caption).toBe('First proof');
    });
  });

  describe('apiClient.reactions.getSummary', () => {
    it('should query /cooking-results/:id/reactions and return all reaction counts', async () => {
      const mockSummary = {
        resultId,
        fireCount: 8,
        yuckCount: 1,
        respectCount: 5,
        laughCount: 2,
        mindBlownCount: 3,
        totalReactions: 19,
        likesCount: 19,
        userReaction: 'fire' as ResultReactionType,
      };

      const fetchSpy = jest.fn().mockResolvedValue({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => mockSummary,
      });
      global.fetch = fetchSpy;

      const res = await apiClient.reactions.getSummary(resultId);

      expect(fetchSpy).toHaveBeenCalledWith(
        expect.stringContaining(`/cooking-results/${resultId}/reactions`),
        expect.anything(),
      );
      expect(res.totalReactions).toBe(19);
      expect(res.fireCount).toBe(8);
      expect(res.userReaction).toBe('fire');
    });
  });

  describe('apiClient.reactions.cast', () => {
    it('should submit reaction choice to POST /cooking-results/:id/reactions', async () => {
      const mockReactionResponse = {
        id: 'reaction-1',
        userId: 'user-001',
        resultId,
        type: 'respect' as ResultReactionType,
        createdAt: '2026-10-17T12:00:00Z',
        updatedAt: '2026-10-17T12:00:00Z',
      };

      const fetchSpy = jest.fn().mockResolvedValue({
        ok: true,
        status: 201,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => mockReactionResponse,
      });
      global.fetch = fetchSpy;

      const res = await apiClient.reactions.cast(resultId, 'respect');

      expect(fetchSpy).toHaveBeenCalledTimes(1);
      const [url, options] = fetchSpy.mock.calls[0];
      expect(url).toContain(`/cooking-results/${resultId}/reactions`);
      expect(options.method).toBe('POST');
      expect(JSON.parse(options.body)).toEqual({ type: 'respect' });
      expect(res.type).toBe('respect');
    });
  });

  describe('apiClient.reactions.remove', () => {
    it('should delete user reaction via DELETE /cooking-results/:id/reactions', async () => {
      const mockDeleteRes = {
        success: true,
        message: 'Reaction deleted successfully',
      };

      const fetchSpy = jest.fn().mockResolvedValue({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => mockDeleteRes,
      });
      global.fetch = fetchSpy;

      const res = await apiClient.reactions.remove(resultId);

      expect(fetchSpy).toHaveBeenCalledTimes(1);
      const [url, options] = fetchSpy.mock.calls[0];
      expect(url).toContain(`/cooking-results/${resultId}/reactions`);
      expect(options.method).toBe('DELETE');
      expect(res.success).toBe(true);
    });
  });
});
