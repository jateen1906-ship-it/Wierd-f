import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { ReactionsService } from './reactions.service';
import { PrismaService } from '../database/prisma.service';
import { castReactionSchema, extractReactionType } from './dto/cast-reaction.dto';
import { userReactionsQuerySchema } from './dto/user-reactions-query.dto';

describe('ReactionsService', () => {
  let service: ReactionsService;
  let prisma: any;

  const mockUserId = '11111111-1111-4111-8111-111111111111';
  const mockOtherUserId = '22222222-2222-4222-8222-222222222222';
  const mockResultId = '33333333-3333-4333-8333-333333333333';
  const mockReactionId = '44444444-4444-4444-8444-444444444444';

  const mockCookingResultRecord = {
    id: mockResultId,
    experimentId: 'exp-1',
    userId: 'cook-1',
    likesCount: 3,
  };

  const mockReactionRecord = {
    id: mockReactionId,
    userId: mockUserId,
    resultId: mockResultId,
    type: 'fire',
    createdAt: new Date('2026-10-17T00:00:00.000Z'),
    updatedAt: new Date('2026-10-17T00:00:00.000Z'),
  };

  beforeEach(async () => {
    prisma = {
      cookingResult: {
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      resultReaction: {
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
      },
      $transaction: jest.fn().mockImplementation(async (callback) => {
        return callback(prisma);
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReactionsService,
        {
          provide: PrismaService,
          useValue: prisma,
        },
      ],
    }).compile();

    service = module.get<ReactionsService>(ReactionsService);
  });

  describe('1. castReaction (Create, Update, Repeat, and Concurrency)', () => {
    it('should create a new reaction and increment cookingResult likesCount by 1', async () => {
      prisma.cookingResult.findUnique.mockResolvedValue(mockCookingResultRecord);
      prisma.resultReaction.findUnique.mockResolvedValue(null);
      prisma.resultReaction.create.mockResolvedValue(mockReactionRecord);
      prisma.cookingResult.update.mockResolvedValue({
        ...mockCookingResultRecord,
        likesCount: mockCookingResultRecord.likesCount + 1,
      });

      const result = await service.castReaction(mockUserId, mockResultId, 'fire');

      expect(prisma.cookingResult.findUnique).toHaveBeenCalledWith({
        where: { id: mockResultId },
        select: { id: true },
      });
      expect(prisma.resultReaction.findUnique).toHaveBeenCalledWith({
        where: {
          unique_user_result_reaction: {
            userId: mockUserId,
            resultId: mockResultId,
          },
        },
      });
      expect(prisma.resultReaction.create).toHaveBeenCalledWith({
        data: {
          userId: mockUserId,
          resultId: mockResultId,
          type: 'fire',
        },
      });
      expect(prisma.cookingResult.update).toHaveBeenCalledWith({
        where: { id: mockResultId },
        data: {
          likesCount: { increment: 1 },
        },
      });
      expect(result.isNew).toBe(true);
      expect(result.reaction.id).toBe(mockReactionId);
      expect(result.reaction.type).toBe('fire');
    });

    it('should update an existing reaction to a new type without incrementing likesCount', async () => {
      prisma.cookingResult.findUnique.mockResolvedValue(mockCookingResultRecord);
      prisma.resultReaction.findUnique.mockResolvedValue(mockReactionRecord);
      const updatedReaction = {
        ...mockReactionRecord,
        type: 'respect',
        updatedAt: new Date('2026-10-17T00:05:00.000Z'),
      };
      prisma.resultReaction.update.mockResolvedValue(updatedReaction);

      const result = await service.castReaction(mockUserId, mockResultId, 'respect');

      expect(prisma.resultReaction.update).toHaveBeenCalledWith({
        where: { id: mockReactionId },
        data: { type: 'respect' },
      });
      // Crucial: likesCount must NOT be incremented on type switch
      expect(prisma.cookingResult.update).not.toHaveBeenCalled();
      expect(result.isNew).toBe(false);
      expect(result.reaction.type).toBe('respect');
    });

    it('should return existing reaction without database write if repeated with same type', async () => {
      prisma.cookingResult.findUnique.mockResolvedValue(mockCookingResultRecord);
      prisma.resultReaction.findUnique.mockResolvedValue(mockReactionRecord);

      const result = await service.castReaction(mockUserId, mockResultId, 'fire');

      expect(prisma.resultReaction.create).not.toHaveBeenCalled();
      expect(prisma.resultReaction.update).not.toHaveBeenCalled();
      expect(prisma.cookingResult.update).not.toHaveBeenCalled();
      expect(result.isNew).toBe(false);
      expect(result.reaction.type).toBe('fire');
    });

    it('should throw NotFoundException if cooking result does not exist', async () => {
      prisma.cookingResult.findUnique.mockResolvedValue(null);

      await expect(
        service.castReaction(mockUserId, 'non-existent-result', 'mind_blown'),
      ).rejects.toThrow(NotFoundException);

      expect(prisma.resultReaction.create).not.toHaveBeenCalled();
      expect(prisma.cookingResult.update).not.toHaveBeenCalled();
    });

    it('should handle P2002 unique constraint race condition by retrying as update', async () => {
      prisma.cookingResult.findUnique.mockResolvedValue(mockCookingResultRecord);
      prisma.resultReaction.findUnique
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(mockReactionRecord);

      const p2002Error: any = new Error('Unique constraint failed');
      p2002Error.code = 'P2002';
      prisma.resultReaction.create.mockRejectedValueOnce(p2002Error);

      const updatedRecord = { ...mockReactionRecord, type: 'yuck' };
      prisma.resultReaction.update.mockResolvedValue(updatedRecord);

      const result = await service.castReaction(mockUserId, mockResultId, 'yuck');

      expect(result.isNew).toBe(false);
      expect(result.reaction.type).toBe('yuck');
    });
  });

  describe('2. getReactionSummary (All 5 Types, Total, Likes, and Personalization)', () => {
    it('should return counts for all five reaction types, totalReactions, likesCount, and userReaction', async () => {
      prisma.cookingResult.findUnique.mockResolvedValue(mockCookingResultRecord);
      prisma.resultReaction.count
        .mockResolvedValueOnce(5) // fire
        .mockResolvedValueOnce(1) // yuck
        .mockResolvedValueOnce(4) // respect
        .mockResolvedValueOnce(2) // laugh
        .mockResolvedValueOnce(3); // mind_blown

      prisma.resultReaction.findUnique.mockResolvedValue({ type: 'fire' });

      const summary = await service.getReactionSummary(mockResultId, mockUserId);

      expect(summary.resultId).toBe(mockResultId);
      expect(summary.fireCount).toBe(5);
      expect(summary.yuckCount).toBe(1);
      expect(summary.respectCount).toBe(4);
      expect(summary.laughCount).toBe(2);
      expect(summary.mindBlownCount).toBe(3);
      expect(summary.totalReactions).toBe(15);
      expect(summary.likesCount).toBe(mockCookingResultRecord.likesCount);
      expect(summary.userReaction).toBe('fire');
    });

    it('should omit userReaction when caller is unauthenticated (no userId)', async () => {
      prisma.cookingResult.findUnique.mockResolvedValue(mockCookingResultRecord);
      prisma.resultReaction.count
        .mockResolvedValueOnce(1)
        .mockResolvedValueOnce(0)
        .mockResolvedValueOnce(0)
        .mockResolvedValueOnce(0)
        .mockResolvedValueOnce(0);

      const summary = await service.getReactionSummary(mockResultId, undefined);

      expect(summary.totalReactions).toBe(1);
      expect(summary.userReaction).toBeUndefined();
      expect(prisma.resultReaction.findUnique).not.toHaveBeenCalled();
    });

    it('should omit userReaction when caller is authenticated but has not reacted', async () => {
      prisma.cookingResult.findUnique.mockResolvedValue(mockCookingResultRecord);
      prisma.resultReaction.count
        .mockResolvedValueOnce(0)
        .mockResolvedValueOnce(0)
        .mockResolvedValueOnce(0)
        .mockResolvedValueOnce(0)
        .mockResolvedValueOnce(0);
      prisma.resultReaction.findUnique.mockResolvedValue(null);

      const summary = await service.getReactionSummary(mockResultId, mockUserId);

      expect(summary.totalReactions).toBe(0);
      expect(summary.userReaction).toBeUndefined();
    });

    it('should throw NotFoundException if cooking result does not exist', async () => {
      prisma.cookingResult.findUnique.mockResolvedValue(null);

      await expect(service.getReactionSummary('unknown-result-id')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('3. deleteReaction (Safe Deletion & Counter Decrement)', () => {
    it('should delete reaction and decrement cookingResult likesCount by 1', async () => {
      prisma.cookingResult.findUnique.mockResolvedValue(mockCookingResultRecord);
      prisma.resultReaction.findUnique.mockResolvedValue(mockReactionRecord);
      prisma.resultReaction.delete.mockResolvedValue(mockReactionRecord);
      prisma.cookingResult.update.mockResolvedValue({
        ...mockCookingResultRecord,
        likesCount: mockCookingResultRecord.likesCount - 1,
      });

      const result = await service.deleteReaction(mockUserId, mockResultId);

      expect(prisma.resultReaction.findUnique).toHaveBeenCalledWith({
        where: {
          unique_user_result_reaction: {
            userId: mockUserId,
            resultId: mockResultId,
          },
        },
      });
      expect(prisma.resultReaction.delete).toHaveBeenCalledWith({
        where: { id: mockReactionId },
      });
      expect(prisma.cookingResult.update).toHaveBeenCalledWith({
        where: { id: mockResultId },
        data: {
          likesCount: { decrement: 1 },
        },
      });
      expect(result.success).toBe(true);
      expect(result.message).toBe('Reaction deleted successfully');
    });

    it('should throw NotFoundException if reaction does not exist and NOT decrement likesCount', async () => {
      prisma.cookingResult.findUnique.mockResolvedValue(mockCookingResultRecord);
      prisma.resultReaction.findUnique.mockResolvedValue(null);

      await expect(service.deleteReaction(mockUserId, mockResultId)).rejects.toThrow(
        NotFoundException,
      );

      expect(prisma.resultReaction.delete).not.toHaveBeenCalled();
      expect(prisma.cookingResult.update).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException if cooking result does not exist', async () => {
      prisma.cookingResult.findUnique.mockResolvedValue(null);

      await expect(service.deleteReaction(mockUserId, 'missing-result-id')).rejects.toThrow(
        NotFoundException,
      );

      expect(prisma.resultReaction.delete).not.toHaveBeenCalled();
      expect(prisma.cookingResult.update).not.toHaveBeenCalled();
    });
  });

  describe('4. getUserReactions (Paginated Reaction History & Isolation)', () => {
    it('should return caller reactions with attached cooking result metadata', async () => {
      const mockReactions = [
        {
          id: 'rx-1',
          userId: mockUserId,
          resultId: 'result-1',
          type: 'mind_blown',
          createdAt: new Date('2026-10-17T01:00:00Z'),
          updatedAt: new Date('2026-10-17T01:00:00Z'),
          result: {
            id: 'result-1',
            experimentId: 'exp-1',
            outcomeTag: 'flavor_bomb',
            caption: 'Epic toast',
          },
        },
      ];

      prisma.resultReaction.findMany.mockResolvedValue(mockReactions);
      prisma.resultReaction.count.mockResolvedValue(1);

      const res = await service.getUserReactions(mockUserId, { page: 1, limit: 10 });

      expect(prisma.resultReaction.findMany).toHaveBeenCalledWith({
        where: { userId: mockUserId },
        include: {
          result: {
            select: {
              id: true,
              experimentId: true,
              outcomeTag: true,
              caption: true,
            },
          },
        },
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        skip: 0,
        take: 10,
      });

      expect(res.items).toHaveLength(1);
      expect(res.items[0]?.result?.outcomeTag).toBe('flavor_bomb');
      expect(res.total).toBe(1);
      expect(res.page).toBe(1);
      expect(res.totalPages).toBe(1);
      expect(res.hasMore).toBe(false);
    });

    it('should isolate other users reactions completely', async () => {
      prisma.resultReaction.findMany.mockResolvedValue([]);
      prisma.resultReaction.count.mockResolvedValue(0);

      await service.getUserReactions(mockOtherUserId, { page: 1, limit: 20 });

      expect(prisma.resultReaction.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: mockOtherUserId },
        }),
      );
    });
  });

  describe('5. DTO Validation Schemas & Helpers', () => {
    it('should accept valid reaction types in type or choice field', () => {
      expect(castReactionSchema.safeParse({ type: 'fire' }).success).toBe(true);
      expect(castReactionSchema.safeParse({ choice: 'yuck' }).success).toBe(true);
      expect(castReactionSchema.safeParse({ type: 'respect' }).success).toBe(true);
      expect(castReactionSchema.safeParse({ choice: 'laugh' }).success).toBe(true);
      expect(castReactionSchema.safeParse({ type: 'mind_blown' }).success).toBe(true);
    });

    it('should extract reaction type correctly', () => {
      expect(extractReactionType({ type: 'fire' })).toBe('fire');
      expect(extractReactionType({ choice: 'mind_blown' })).toBe('mind_blown');
    });

    it('should reject invalid reaction types like "thumbs_up", empty string, or missing', () => {
      expect(castReactionSchema.safeParse({ type: 'thumbs_up' }).success).toBe(false);
      expect(castReactionSchema.safeParse({ choice: 'like' }).success).toBe(false);
      expect(castReactionSchema.safeParse({ type: '' }).success).toBe(false);
      expect(castReactionSchema.safeParse({}).success).toBe(false);
    });

    it('should enforce pagination rules on userReactionsQuerySchema', () => {
      const valid = userReactionsQuerySchema.safeParse({ page: '2', limit: '15' });
      expect(valid.success).toBe(true);
      if (valid.success) {
        expect(valid.data.page).toBe(2);
        expect(valid.data.limit).toBe(15);
      }

      const def = userReactionsQuerySchema.safeParse({});
      expect(def.success).toBe(true);
      if (def.success) {
        expect(def.data.page).toBe(1);
        expect(def.data.limit).toBe(20);
      }

      expect(userReactionsQuerySchema.safeParse({ page: 0 }).success).toBe(false);
      expect(userReactionsQuerySchema.safeParse({ limit: 0 }).success).toBe(false);
      expect(userReactionsQuerySchema.safeParse({ limit: 101 }).success).toBe(false);
    });
  });
});
