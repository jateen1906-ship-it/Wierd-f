import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { CookingResultsService } from './cooking-results.service';
import { PrismaService } from '../database/prisma.service';
import { ParseCookingResultIdPipe } from './pipes/parse-cooking-result-id.pipe';
import type { CreateCookingResultDto } from './dto/create-cooking-result.dto';

describe('CookingResultsService', () => {
  let service: CookingResultsService;
  let prisma: any;

  const mockCookUser = {
    id: '11111111-1111-4111-8111-111111111111',
    username: 'chef_tester',
    displayName: 'Chef Tester',
    avatarUrl: 'https://cdn.wierd.food/avatars/chef.jpg',
    skillLevel: 'intermediate',
    email: 'chef@wierd.food',
    passwordHash: '$2a$12$SecretHashValueThatMustNeverLeak',
  };

  const mockExperimentId = '22222222-2222-4222-8222-222222222222';
  const mockResultId = '33333333-3333-4333-8333-333333333333';

  const mockCookingResultRecord = {
    id: mockResultId,
    experimentId: mockExperimentId,
    userId: mockCookUser.id,
    media: [
      {
        id: 'media-1',
        url: 'https://cdn.wierd.food/results/proof1.jpg',
        type: 'image',
      },
    ],
    caption: 'Maggi with Sourdough crumbs actually worked!',
    notes: 'Toasted the crumbs in butter first for 2 minutes.',
    outcomeTag: 'unexpectedly_worked',
    tasteRating: 4,
    textureRating: 4,
    wouldMakeAgain: true,
    modificationsMade: 'Added extra chili flakes',
    likesCount: 0,
    createdAt: new Date('2026-10-16T12:00:00Z'),
    updatedAt: new Date('2026-10-16T12:00:00Z'),
    user: {
      id: mockCookUser.id,
      username: mockCookUser.username,
      displayName: mockCookUser.displayName,
      avatarUrl: mockCookUser.avatarUrl,
      skillLevel: mockCookUser.skillLevel,
    },
  };

  beforeEach(async () => {
    prisma = {
      experiment: {
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      cookingResult: {
        create: jest.fn(),
        findUnique: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
      },
      $transaction: jest.fn().mockImplementation(async (callback) => {
        return callback(prisma);
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CookingResultsService,
        {
          provide: PrismaService,
          useValue: prisma,
        },
      ],
    }).compile();

    service = module.get<CookingResultsService>(CookingResultsService);
  });

  describe('1. create (Post Cooking Result)', () => {
    const validDto: CreateCookingResultDto = {
      experimentId: mockExperimentId,
      media: [
        {
          id: 'media-1',
          url: 'https://cdn.wierd.food/results/proof1.jpg',
          type: 'image',
        },
      ],
      caption: 'Maggi with Sourdough crumbs actually worked!',
      notes: 'Toasted the crumbs in butter first for 2 minutes.',
      outcomeTag: 'unexpectedly_worked',
      tasteRating: 4,
      textureRating: 4,
      wouldMakeAgain: true,
      modificationsMade: 'Added extra chili flakes',
    };

    it('should successfully create a cooking result and increment experiment stats', async () => {
      prisma.experiment.findUnique.mockResolvedValue({
        id: mockExperimentId,
        safetyStatus: 'APPROVED',
      });
      prisma.cookingResult.create.mockResolvedValue(mockCookingResultRecord);
      prisma.experiment.update.mockResolvedValue({
        id: mockExperimentId,
        resultCount: 1,
        cookCount: 1,
      });

      const result = await service.create(mockCookUser.id, validDto);

      expect(prisma.experiment.findUnique).toHaveBeenCalledWith({
        where: { id: mockExperimentId },
        select: { id: true, safetyStatus: true },
      });

      expect(prisma.cookingResult.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            experimentId: mockExperimentId,
            userId: mockCookUser.id,
            outcomeTag: 'unexpectedly_worked',
            tasteRating: 4,
            textureRating: 4,
            wouldMakeAgain: true,
            likesCount: 0,
          }),
        }),
      );

      // Verify experiment resultCount and cookCount were incremented
      expect(prisma.experiment.update).toHaveBeenCalledWith({
        where: { id: mockExperimentId },
        data: {
          resultCount: { increment: 1 },
          cookCount: { increment: 1 },
        },
      });

      expect(result.id).toBe(mockResultId);
      expect(result.userId).toBe(mockCookUser.id);
      expect(result.user?.username).toBe('chef_tester');
      // Ensure private fields are not exposed
      expect((result as any).passwordHash).toBeUndefined();
      expect((result.user as any)?.passwordHash).toBeUndefined();
      expect((result.user as any)?.email).toBeUndefined();
    });

    it('should throw NotFoundException if referenced experiment does not exist', async () => {
      prisma.experiment.findUnique.mockResolvedValue(null);

      await expect(service.create(mockCookUser.id, validDto)).rejects.toThrow(NotFoundException);

      expect(prisma.cookingResult.create).not.toHaveBeenCalled();
      expect(prisma.experiment.update).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException if referenced experiment is BLOCKED', async () => {
      prisma.experiment.findUnique.mockResolvedValue({
        id: mockExperimentId,
        safetyStatus: 'BLOCKED',
      });

      await expect(service.create(mockCookUser.id, validDto)).rejects.toThrow(NotFoundException);

      expect(prisma.cookingResult.create).not.toHaveBeenCalled();
      expect(prisma.experiment.update).not.toHaveBeenCalled();
    });

    it('should enforce that the authenticated user ID is used and cannot be spoofed', async () => {
      prisma.experiment.findUnique.mockResolvedValue({
        id: mockExperimentId,
        safetyStatus: 'APPROVED',
      });
      prisma.cookingResult.create.mockResolvedValue(mockCookingResultRecord);
      prisma.experiment.update.mockResolvedValue({ id: mockExperimentId });

      const spoofAttemptDto = {
        ...validDto,
        userId: 'spoofed-attacker-user-id',
      } as any;

      await service.create(mockCookUser.id, spoofAttemptDto);

      expect(prisma.cookingResult.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            userId: mockCookUser.id, // Strictly uses authenticated user ID
          }),
        }),
      );
    });
  });

  describe('2. findOne (Get Single Cooking Result)', () => {
    it('should return sanitized cooking result when found', async () => {
      prisma.cookingResult.findUnique.mockResolvedValue({
        ...mockCookingResultRecord,
        experiment: { safetyStatus: 'APPROVED' },
      });

      const result = await service.findOne(mockResultId);

      expect(result.id).toBe(mockResultId);
      expect(result.experimentId).toBe(mockExperimentId);
      expect(result.user?.displayName).toBe('Chef Tester');
      expect((result as any).passwordHash).toBeUndefined();
    });

    it('should throw NotFoundException when result does not exist', async () => {
      prisma.cookingResult.findUnique.mockResolvedValue(null);

      await expect(service.findOne('non-existent-id')).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException when associated experiment is BLOCKED', async () => {
      prisma.cookingResult.findUnique.mockResolvedValue({
        ...mockCookingResultRecord,
        experiment: { safetyStatus: 'BLOCKED' },
      });

      await expect(service.findOne(mockResultId)).rejects.toThrow(NotFoundException);
    });
  });

  describe('3. findByExperiment (List Results for Experiment)', () => {
    it('should return paginated results with stable ordering when experiment exists', async () => {
      prisma.experiment.findUnique.mockResolvedValue({
        id: mockExperimentId,
        safetyStatus: 'APPROVED',
      });
      prisma.cookingResult.findMany.mockResolvedValue([mockCookingResultRecord]);
      prisma.cookingResult.count.mockResolvedValue(1);

      const result = await service.findByExperiment(mockExperimentId, { page: 1, limit: 10 });

      expect(prisma.experiment.findUnique).toHaveBeenCalledWith({
        where: { id: mockExperimentId },
        select: { id: true, safetyStatus: true },
      });

      expect(prisma.cookingResult.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { experimentId: mockExperimentId },
          orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
          skip: 0,
          take: 10,
        }),
      );

      expect(result.items).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(10);
      expect(result.totalPages).toBe(1);
      expect(result.hasMore).toBe(false);
    });

    it('should throw NotFoundException if experiment does not exist', async () => {
      prisma.experiment.findUnique.mockResolvedValue(null);

      await expect(
        service.findByExperiment('non-existent-exp-id', { page: 1, limit: 10 }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException if experiment is BLOCKED', async () => {
      prisma.experiment.findUnique.mockResolvedValue({
        id: mockExperimentId,
        safetyStatus: 'BLOCKED',
      });

      await expect(
        service.findByExperiment(mockExperimentId, { page: 1, limit: 10 }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('4. findByUser (List Authenticated User Results)', () => {
    it('should return paginated results for the authenticated user with data isolation', async () => {
      prisma.cookingResult.findMany.mockResolvedValue([mockCookingResultRecord]);
      prisma.cookingResult.count.mockResolvedValue(1);

      const result = await service.findByUser(mockCookUser.id, { page: 1, limit: 20 });

      expect(prisma.cookingResult.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: mockCookUser.id, experiment: { safetyStatus: { not: 'BLOCKED' } } },
          orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
          skip: 0,
          take: 20,
        }),
      );

      expect(result.items).toHaveLength(1);
      expect(result.items[0]?.userId).toBe(mockCookUser.id);
      expect(result.total).toBe(1);
    });
  });

  describe('5. ParseCookingResultIdPipe', () => {
    const pipe = new ParseCookingResultIdPipe();

    it('should return valid UUID v4 unchanged', () => {
      const validUuid = '11111111-1111-4111-8111-111111111111';
      expect(pipe.transform(validUuid)).toBe(validUuid);
    });

    it('should throw BadRequestException on invalid UUID string', () => {
      expect(() => pipe.transform('invalid-not-uuid')).toThrow(BadRequestException);
      expect(() => pipe.transform('')).toThrow(BadRequestException);
    });
  });

  describe('6. Security & Authorization Audit', () => {
    it('should not expose userId filtering on public cookingResultQuerySchema', () => {
      const { cookingResultQuerySchema } = require('./dto/cooking-result-query.dto');
      const parsed = cookingResultQuerySchema.parse({
        page: '1',
        limit: '20',
        userId: '11111111-1111-4111-8111-111111111111',
      });
      // userId must not be accepted or passed through to public query
      expect((parsed as any).userId).toBeUndefined();
    });

    it('should sanitize user profile and never expose passwordHash or email in response', () => {
      const { toCookingResultResponse } = require('./dto/cooking-result-response.dto');
      const rawWithSensitiveData = {
        ...mockCookingResultRecord,
        user: {
          ...mockCookUser,
        },
      };

      const sanitized = toCookingResultResponse(rawWithSensitiveData as any);
      expect((sanitized as any).passwordHash).toBeUndefined();
      expect((sanitized as any).email).toBeUndefined();
      expect((sanitized.user as any)?.passwordHash).toBeUndefined();
      expect((sanitized.user as any)?.email).toBeUndefined();
      expect(sanitized.user?.username).toBe('chef_tester');
    });
  });
});
