import { apiClient, ApiError } from './api-client';

describe('Tree API Client Method', () => {
  beforeEach(() => {
    jest.restoreAllMocks();
  });

  describe('apiClient.experiments.tree', () => {
    it('should query /experiments/:id/tree and return full hierarchical family tree', async () => {
      const mockTreeResponse = {
        rootId: 'root-exp-100',
        targetExperimentId: 'remix-exp-200',
        totalNodes: 3,
        tree: {
          id: 'root-exp-100',
          title: 'Root Maggi',
          creator: {
            id: 'u-1',
            username: 'cook1',
            displayName: 'Cook One',
            avatarUrl: null,
            skillLevel: 'intermediate',
          },
          parentId: null,
          rootId: null,
          branchDepth: 0,
          createdAt: '2026-10-17T10:00:00Z',
          remixCount: 2,
          cookCount: 10,
          voteCount: 20,
          resultCount: 5,
          children: [
            {
              id: 'remix-exp-200',
              title: 'Butter Garlic Maggi',
              creator: {
                id: 'u-2',
                username: 'cook2',
                displayName: 'Cook Two',
                avatarUrl: null,
                skillLevel: 'advanced',
              },
              parentId: 'root-exp-100',
              rootId: 'root-exp-100',
              branchDepth: 1,
              createdAt: '2026-10-17T11:00:00Z',
              remixCount: 0,
              cookCount: 3,
              voteCount: 8,
              resultCount: 1,
              children: [],
            },
          ],
        },
        nodes: [
          {
            id: 'root-exp-100',
            title: 'Root Maggi',
            branchDepth: 0,
          },
          {
            id: 'remix-exp-200',
            title: 'Butter Garlic Maggi',
            branchDepth: 1,
          },
        ],
      };

      const fetchSpy = jest.fn().mockResolvedValue({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => mockTreeResponse,
      });
      global.fetch = fetchSpy;

      const response = await apiClient.experiments.tree('remix-exp-200');

      expect(fetchSpy).toHaveBeenCalledTimes(1);
      const [url] = fetchSpy.mock.calls[0];
      expect(url).toContain('/experiments/remix-exp-200/tree');
      expect(response.rootId).toBe('root-exp-100');
      expect(response.targetExperimentId).toBe('remix-exp-200');
      expect(response.totalNodes).toBe(3);
      expect(response.tree.id).toBe('root-exp-100');
      expect(response.tree.children[0].id).toBe('remix-exp-200');
    });

    it('should throw ApiError when tree endpoint returns error', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 404,
        statusText: 'Not Found',
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({
          message: 'Experiment with ID "missing-id" was not found',
          error: 'Not Found',
          statusCode: 404,
        }),
      });

      await expect(apiClient.experiments.tree('missing-id')).rejects.toThrow(ApiError);
      await expect(apiClient.experiments.tree('missing-id')).rejects.toMatchObject({
        statusCode: 404,
        message: 'Experiment with ID "missing-id" was not found',
      });
    });
  });
});
