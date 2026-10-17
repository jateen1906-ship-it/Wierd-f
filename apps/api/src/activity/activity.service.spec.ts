import { Test, TestingModule } from '@nestjs/testing';
import { ActivityService } from './activity.service';
import { PrismaService } from '../database/prisma.service';

describe('ActivityService', () => {
  let service: ActivityService;
  let prisma: {
    experiment: {
      findMany: jest.Mock;
      count: jest.Mock;
    };
    cookingResult: {
      findMany: jest.Mock;
      count: jest.Mock;
    };
  };

  const mockSafeActor = {
    id: 'user-1',
    username: 'chef_mario',
    displayName: 'Chef Mario',
    avatarUrl: null,
    skillLevel: 'kettle_pro',
  };

  beforeEach(async () => {
    prisma = {
      experiment: {
        findMany: jest.fn(),
        count: jest.fn(),
      },
      cookingResult: {
        findMany: jest.fn(),
        count: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [ActivityService, { provide: PrismaService, useValue: prisma }],
    }).compile();

    service = module.get<ActivityService>(ActivityService);
  });

  describe('getActivity - Combined Feed (type="all")', () => {
    it('merges root experiments, remixes, and cooking results sorted deterministically by [createdAt DESC, id DESC]', async () => {
      const mockExperiments = [
        {
          id: 'exp-root-1',
          title: 'Crispy Kimchi Rice',
          difficulty: 'medium',
          parentId: null,
          branchDepth: 0,
          heroMedia: null,
          createdAt: new Date('2026-10-18T10:00:00Z'),
          creator: mockSafeActor,
        },
        {
          id: 'exp-remix-2',
          title: 'Spicy Kimchi Rice with Cheese',
          difficulty: 'hard',
          parentId: 'exp-root-1',
          branchDepth: 1,
          heroMedia: null,
          createdAt: new Date('2026-10-18T12:00:00Z'),
          creator: { ...mockSafeActor, id: 'user-2', username: 'luigi' },
          parent: { id: 'exp-root-1', title: 'Crispy Kimchi Rice' },
        },
      ];

      const mockCookingResults = [
        {
          id: 'cr-1',
          outcomeTag: 'unexpectedly_worked',
          tasteRating: 5,
          textureRating: 4,
          wouldMakeAgain: true,
          caption: 'Surprisingly crunchy and delicious!',
          media: [{ url: 'https://example.com/photo.jpg' }],
          createdAt: new Date('2026-10-18T11:00:00Z'),
          user: mockSafeActor,
          experiment: {
            id: 'exp-root-1',
            title: 'Crispy Kimchi Rice',
            difficulty: 'medium',
            heroMedia: null,
            safetyStatus: 'SAFE',
          },
        },
      ];

      prisma.experiment.findMany.mockResolvedValue(mockExperiments);
      prisma.cookingResult.findMany.mockResolvedValue(mockCookingResults);
      prisma.experiment.count.mockResolvedValue(2);
      prisma.cookingResult.count.mockResolvedValue(1);

      const result = await service.getActivity({ page: 1, limit: 10, type: 'all' });

      expect(result.items).toHaveLength(3);
      expect(result.total).toBe(3);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(10);
      expect(result.totalPages).toBe(1);
      expect(result.hasMore).toBe(false);

      // Verify deterministic descending chronological order:
      // 1. Remix at 12:00:00Z
      // 2. Cooking Result at 11:00:00Z
      // 3. Root experiment at 10:00:00Z
      expect(result.items[0]!.type).toBe('remix');
      expect(result.items[0]!.id).toBe('exp-exp-remix-2');
      expect(result.items[0]!.message).toContain('remixed "Crispy Kimchi Rice"');

      expect(result.items[1]!.type).toBe('cooking_result');
      expect(result.items[1]!.id).toBe('cr-cr-1');
      expect(result.items[1]!.cookingResult?.outcomeTag).toBe('unexpectedly_worked');

      expect(result.items[2]!.type).toBe('root_experiment');
      expect(result.items[2]!.id).toBe('exp-exp-root-1');
      expect(result.items[2]!.message).toContain('cooked up a new root experiment');

      // Verify safety filter in Prisma query
      expect(prisma.experiment.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { safetyStatus: { not: 'BLOCKED' } },
        }),
      );
      expect(prisma.cookingResult.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { experiment: { safetyStatus: { not: 'BLOCKED' } } },
        }),
      );
    });
  });

  describe('getActivity - Filter by type', () => {
    it('queries only root experiments when type="root_experiment"', async () => {
      prisma.experiment.findMany.mockResolvedValue([
        {
          id: 'exp-root-1',
          title: 'Hostel Mug Cake',
          difficulty: 'easy',
          parentId: null,
          branchDepth: 0,
          createdAt: new Date(),
          creator: mockSafeActor,
        },
      ]);
      prisma.experiment.count.mockResolvedValue(1);

      const result = await service.getActivity({ page: 1, limit: 10, type: 'root_experiment' });

      expect(result.items).toHaveLength(1);
      expect(result.items[0]!.type).toBe('root_experiment');
      expect(prisma.experiment.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            safetyStatus: { not: 'BLOCKED' },
            parentId: null,
          },
        }),
      );
      expect(prisma.cookingResult.findMany).not.toHaveBeenCalled();
    });

    it('queries only remixes when type="remix"', async () => {
      prisma.experiment.findMany.mockResolvedValue([
        {
          id: 'exp-remix-1',
          title: 'Remixed Mug Cake',
          difficulty: 'medium',
          parentId: 'parent-1',
          branchDepth: 1,
          createdAt: new Date(),
          creator: mockSafeActor,
          parent: { id: 'parent-1', title: 'Hostel Mug Cake' },
        },
      ]);
      prisma.experiment.count.mockResolvedValue(1);

      const result = await service.getActivity({ page: 1, limit: 10, type: 'remix' });

      expect(result.items).toHaveLength(1);
      expect(result.items[0]!.type).toBe('remix');
      expect(prisma.experiment.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            safetyStatus: { not: 'BLOCKED' },
            parentId: { not: null },
          },
        }),
      );
      expect(prisma.cookingResult.findMany).not.toHaveBeenCalled();
    });

    it('queries only cooking results when type="cooking_result"', async () => {
      prisma.cookingResult.findMany.mockResolvedValue([
        {
          id: 'cr-10',
          outcomeTag: 'worked_perfectly',
          tasteRating: 5,
          wouldMakeAgain: true,
          caption: 'Great result',
          media: [],
          createdAt: new Date(),
          user: mockSafeActor,
          experiment: {
            id: 'exp-1',
            title: 'Mug Cake',
            difficulty: 'easy',
            safetyStatus: 'SAFE',
          },
        },
      ]);
      prisma.cookingResult.count.mockResolvedValue(1);

      const result = await service.getActivity({ page: 1, limit: 10, type: 'cooking_result' });

      expect(result.items).toHaveLength(1);
      expect(result.items[0]!.type).toBe('cooking_result');
      expect(prisma.cookingResult.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            experiment: { safetyStatus: { not: 'BLOCKED' } },
          },
        }),
      );
      expect(prisma.experiment.findMany).not.toHaveBeenCalled();
    });
  });

  describe('Safety & Stale Records Handling', () => {
    it('safely filters out cooking results referencing missing or blocked experiments', async () => {
      prisma.cookingResult.findMany.mockResolvedValue([
        {
          id: 'cr-valid',
          outcomeTag: 'unexpectedly_worked',
          tasteRating: 4,
          wouldMakeAgain: true,
          caption: null,
          media: [],
          createdAt: new Date(),
          user: mockSafeActor,
          experiment: {
            id: 'exp-safe',
            title: 'Safe Experiment',
            difficulty: 'easy',
            safetyStatus: 'SAFE',
          },
        },
        {
          id: 'cr-stale',
          outcomeTag: 'failed',
          tasteRating: 1,
          wouldMakeAgain: false,
          caption: null,
          media: [],
          createdAt: new Date(),
          user: mockSafeActor,
          experiment: null, // deleted experiment edge case
        },
      ]);
      prisma.cookingResult.count.mockResolvedValue(2);

      const result = await service.getActivity({ page: 1, limit: 10, type: 'cooking_result' });

      expect(result.items).toHaveLength(1);
      expect(result.items[0]!.id).toBe('cr-cr-valid');
    });
  });
});
