import { apiClient, ApiError } from './api-client';

describe('Experiments & Ingredients API Client Methods', () => {
  beforeEach(() => {
    apiClient.setToken('test-jwt-access-token');
    jest.restoreAllMocks();
  });

  afterEach(() => {
    apiClient.setToken(null);
  });

  describe('apiClient.experiments.create', () => {
    it('should submit creation payload to /experiments with auth headers', async () => {
      const mockExperimentResponse = {
        id: 'new-exp-id-001',
        title: 'Midnight Hostel Egg Maggi',
        description: 'Survival recipe perfected during semester finals.',
        difficulty: 'easy',
        branchDepth: 0,
        createdAt: '2026-10-17T12:00:00Z',
        creator: {
          id: 'user-1',
          username: 'hostelcook',
          displayName: 'Hostel Cook',
        },
      };

      const fetchSpy = jest.fn().mockResolvedValue({
        ok: true,
        status: 201,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => mockExperimentResponse,
      });
      global.fetch = fetchSpy;

      const payload = {
        title: 'Midnight Hostel Egg Maggi',
        description: 'Survival recipe perfected during semester finals.',
        difficulty: 'easy' as const,
        estimatedTimeMinutes: 10,
        estimatedCost: { min: 30, max: 50, currency: 'INR' },
        ingredients: [
          {
            name: 'Maggi Noodles',
            quantity: 1,
            unit: 'packet',
            isOptional: false,
            isCustomAddition: false,
          },
        ],
        steps: [
          {
            stepNumber: 1,
            instruction: 'Boil water and cook noodles with tastemaker',
            isCritical: false,
          },
        ],
      };

      const result = await apiClient.experiments.create(payload);

      expect(fetchSpy).toHaveBeenCalledTimes(1);
      const [url, options] = fetchSpy.mock.calls[0];
      expect(url).toContain('/experiments');
      expect(options.method).toBe('POST');
      expect(options.headers).toMatchObject({
        'Content-Type': 'application/json',
        Authorization: 'Bearer test-jwt-access-token',
      });
      expect(JSON.parse(options.body)).toMatchObject(payload);
      expect(result.id).toBe('new-exp-id-001');
    });

    it('should throw ApiError with backend validation failure messages', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 400,
        statusText: 'Bad Request',
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({
          message: 'Title must be at least 3 characters',
          error: 'Bad Request',
          statusCode: 400,
        }),
      });

      await expect(
        apiClient.experiments.create({
          title: 'A',
          description: 'Short',
          difficulty: 'easy',
          estimatedTimeMinutes: 5,
          estimatedCost: { min: 10, max: 20, currency: 'INR' },
          ingredients: [],
          steps: [],
        }),
      ).rejects.toMatchObject({
        statusCode: 400,
        message: 'Title must be at least 3 characters',
      });
    });
  });

  describe('apiClient.experiments.remix', () => {
    it('should submit remix payload to /experiments/:id/remix preserving parent lineage', async () => {
      const mockRemixResponse = {
        id: 'remixed-exp-id-002',
        parentId: 'parent-exp-id-001',
        rootId: 'parent-exp-id-001',
        branchDepth: 1,
        title: '[Remix] Midnight Butter Garlic Maggi',
        description: 'Swapped water for milky garlic broth.',
        transformations: [
          {
            type: 'ingredient_added',
            description: 'Added butter garlic paste',
          },
        ],
      };

      const fetchSpy = jest.fn().mockResolvedValue({
        ok: true,
        status: 201,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => mockRemixResponse,
      });
      global.fetch = fetchSpy;

      const remixPayload = {
        title: '[Remix] Midnight Butter Garlic Maggi',
        description: 'Swapped water for milky garlic broth.',
        transformations: [
          {
            type: 'ingredient_added' as const,
            description: 'Added butter garlic paste',
          },
        ],
        ingredients: [
          {
            name: 'Maggi Noodles',
            quantity: 1,
            unit: 'packet',
            isOptional: false,
            isCustomAddition: false,
          },
        ],
        steps: [
          {
            stepNumber: 1,
            instruction: 'Melt butter with garlic before adding noodles',
            isCritical: true,
          },
        ],
      };

      const result = await apiClient.experiments.remix('parent-exp-id-001', remixPayload);

      expect(fetchSpy).toHaveBeenCalledTimes(1);
      const [url, options] = fetchSpy.mock.calls[0];
      expect(url).toContain('/experiments/parent-exp-id-001/remix');
      expect(options.method).toBe('POST');
      expect(result.branchDepth).toBe(1);
      expect(result.parentId).toBe('parent-exp-id-001');
    });
  });

  describe('apiClient.experiments.lineage', () => {
    it('should fetch ancestor chain from /experiments/:id/lineage', async () => {
      const mockLineage = {
        experimentId: 'child-id',
        chainLength: 2,
        ancestors: [
          {
            id: 'root-id',
            title: 'OG Kettle Maggi',
            branchDepth: 0,
            creator: { username: 'founder' },
          },
        ],
        chain: [
          {
            id: 'root-id',
            title: 'OG Kettle Maggi',
            branchDepth: 0,
            creator: { username: 'founder' },
          },
          {
            id: 'child-id',
            title: 'Garlic Maggi',
            branchDepth: 1,
            creator: { username: 'hostelchef' },
          },
        ],
      };

      const fetchSpy = jest.fn().mockResolvedValue({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => mockLineage,
      });
      global.fetch = fetchSpy;

      const res = await apiClient.experiments.lineage('child-id');
      expect(fetchSpy).toHaveBeenCalledWith(
        expect.stringContaining('/experiments/child-id/lineage'),
        expect.anything(),
      );
      expect(res.chainLength).toBe(2);
      expect(res.chain[0].title).toBe('OG Kettle Maggi');
    });
  });

  describe('apiClient.ingredients.list', () => {
    it('should search canonical ingredients using query parameter', async () => {
      const mockIngredients = {
        items: [
          {
            id: 'ing-1',
            name: 'Instant Noodles',
            category: 'staple',
            commonSubstitutions: ['Ramen', 'Wai Wai'],
            isCommonAllergen: false,
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
        json: async () => mockIngredients,
      });
      global.fetch = fetchSpy;

      const res = await apiClient.ingredients.list('Noodles', 10);
      expect(fetchSpy).toHaveBeenCalledWith(
        expect.stringContaining('/ingredients?query=Noodles&limit=10'),
        expect.anything(),
      );
      expect(res.items.length).toBe(1);
      expect(res.items[0].name).toBe('Instant Noodles');
    });
  });
});
