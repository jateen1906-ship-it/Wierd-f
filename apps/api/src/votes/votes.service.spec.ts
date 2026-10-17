import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { VotesService } from './votes.service';
import { PrismaService } from '../database/prisma.service';
import { castVoteSchema } from './dto/cast-vote.dto';
import { userVotesQuerySchema } from './dto/user-votes-query.dto';

describe('VotesService', () => {
  let service: VotesService;
  let prisma: any;

  const mockUserId = '11111111-1111-4111-8111-111111111111';
  const mockOtherUserId = '22222222-2222-4222-8222-222222222222';
  const mockExperimentId = '33333333-3333-4333-8333-333333333333';
  const mockVoteId = '44444444-4444-4444-8444-444444444444';

  const mockExperimentRecord = {
    id: mockExperimentId,
    title: 'Pickle Peanut Butter Brownies',
    voteCount: 5,
  };

  const mockVoteRecord = {
    id: mockVoteId,
    userId: mockUserId,
    experimentId: mockExperimentId,
    choice: 'would_try',
    createdAt: new Date('2026-10-16T10:00:00.000Z'),
    updatedAt: new Date('2026-10-16T10:00:00.000Z'),
  };

  beforeEach(async () => {
    prisma = {
      experiment: {
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      vote: {
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
        VotesService,
        {
          provide: PrismaService,
          useValue: prisma,
        },
      ],
    }).compile();

    service = module.get<VotesService>(VotesService);
  });

  describe('1. castVote (Create / Update Vote)', () => {
    it('should create a new vote and increment experiment voteCount by 1', async () => {
      prisma.experiment.findUnique.mockResolvedValue(mockExperimentRecord);
      prisma.vote.findUnique.mockResolvedValue(null);
      prisma.vote.create.mockResolvedValue(mockVoteRecord);
      prisma.experiment.update.mockResolvedValue({
        ...mockExperimentRecord,
        voteCount: mockExperimentRecord.voteCount + 1,
      });

      const result = await service.castVote(mockUserId, mockExperimentId, 'would_try');

      expect(prisma.experiment.findUnique).toHaveBeenCalledWith({
        where: { id: mockExperimentId },
        select: { id: true, safetyStatus: true },
      });
      expect(prisma.vote.findUnique).toHaveBeenCalledWith({
        where: {
          unique_user_experiment_vote: {
            userId: mockUserId,
            experimentId: mockExperimentId,
          },
        },
      });
      expect(prisma.vote.create).toHaveBeenCalledWith({
        data: {
          userId: mockUserId,
          experimentId: mockExperimentId,
          choice: 'would_try',
        },
      });
      expect(prisma.experiment.update).toHaveBeenCalledWith({
        where: { id: mockExperimentId },
        data: {
          voteCount: { increment: 1 },
        },
      });
      expect(result.isNew).toBe(true);
      expect(result.vote.id).toBe(mockVoteId);
      expect(result.vote.choice).toBe('would_try');
      expect(result.vote.userId).toBe(mockUserId);
    });

    it('should update an existing vote and NOT increment experiment voteCount', async () => {
      prisma.experiment.findUnique.mockResolvedValue(mockExperimentRecord);
      prisma.vote.findUnique.mockResolvedValue(mockVoteRecord);
      const updatedRecord = {
        ...mockVoteRecord,
        choice: 'pass',
        updatedAt: new Date('2026-10-16T11:00:00.000Z'),
      };
      prisma.vote.update.mockResolvedValue(updatedRecord);

      const result = await service.castVote(mockUserId, mockExperimentId, 'pass');

      expect(prisma.vote.update).toHaveBeenCalledWith({
        where: { id: mockVoteId },
        data: { choice: 'pass' },
      });
      // Crucial: voteCount must NOT be incremented on update
      expect(prisma.experiment.update).not.toHaveBeenCalled();
      expect(result.isNew).toBe(false);
      expect(result.vote.choice).toBe('pass');
    });

    it('should return existing vote without database write if choice is unchanged', async () => {
      prisma.experiment.findUnique.mockResolvedValue(mockExperimentRecord);
      prisma.vote.findUnique.mockResolvedValue(mockVoteRecord);

      const result = await service.castVote(mockUserId, mockExperimentId, 'would_try');

      expect(prisma.vote.update).not.toHaveBeenCalled();
      expect(prisma.vote.create).not.toHaveBeenCalled();
      expect(prisma.experiment.update).not.toHaveBeenCalled();
      expect(result.isNew).toBe(false);
      expect(result.vote.choice).toBe('would_try');
    });

    it('should throw NotFoundException when experiment does not exist', async () => {
      prisma.experiment.findUnique.mockResolvedValue(null);

      await expect(
        service.castVote(mockUserId, 'non-existent-experiment', 'would_try'),
      ).rejects.toThrow(NotFoundException);

      expect(prisma.vote.create).not.toHaveBeenCalled();
      expect(prisma.experiment.update).not.toHaveBeenCalled();
    });

    it('should handle P2002 unique constraint race condition by retrying as update', async () => {
      // First attempt: experiment exists, findUnique says no vote yet, but concurrent insert throws P2002
      prisma.experiment.findUnique.mockResolvedValue(mockExperimentRecord);
      prisma.vote.findUnique.mockResolvedValueOnce(null).mockResolvedValueOnce(mockVoteRecord); // On retry, existing vote is found

      const p2002Error: any = new Error('Unique constraint failed');
      p2002Error.code = 'P2002';
      prisma.vote.create.mockRejectedValueOnce(p2002Error);

      const updatedRecord = { ...mockVoteRecord, choice: 'pass' };
      prisma.vote.update.mockResolvedValue(updatedRecord);

      const result = await service.castVote(mockUserId, mockExperimentId, 'pass');

      expect(result.isNew).toBe(false);
      expect(result.vote.choice).toBe('pass');
    });
  });

  describe('2. getVoteSummary (Aggregate Counts & User Status)', () => {
    it('should return aggregate counts and caller vote when authenticated', async () => {
      prisma.experiment.findUnique.mockResolvedValue(mockExperimentRecord);
      prisma.vote.count
        .mockResolvedValueOnce(15) // would_try count
        .mockResolvedValueOnce(5); // pass count
      prisma.vote.findUnique.mockResolvedValue({ choice: 'would_try' });

      const summary = await service.getVoteSummary(mockExperimentId, mockUserId);

      expect(summary.experimentId).toBe(mockExperimentId);
      expect(summary.wouldTryCount).toBe(15);
      expect(summary.passCount).toBe(5);
      expect(summary.totalVotes).toBe(20);
      expect(summary.userVote).toBe('would_try');
    });

    it('should omit userVote when caller is unauthenticated (no userId)', async () => {
      prisma.experiment.findUnique.mockResolvedValue(mockExperimentRecord);
      prisma.vote.count.mockResolvedValueOnce(10).mockResolvedValueOnce(2);

      const summary = await service.getVoteSummary(mockExperimentId, undefined);

      expect(summary.wouldTryCount).toBe(10);
      expect(summary.passCount).toBe(2);
      expect(summary.totalVotes).toBe(12);
      expect(summary.userVote).toBeUndefined();
      expect(prisma.vote.findUnique).not.toHaveBeenCalled();
    });

    it('should omit userVote when caller is authenticated but has not voted', async () => {
      prisma.experiment.findUnique.mockResolvedValue(mockExperimentRecord);
      prisma.vote.count.mockResolvedValueOnce(8).mockResolvedValueOnce(3);
      prisma.vote.findUnique.mockResolvedValue(null);

      const summary = await service.getVoteSummary(mockExperimentId, mockUserId);

      expect(summary.totalVotes).toBe(11);
      expect(summary.userVote).toBeUndefined();
    });

    it('should throw NotFoundException if experiment does not exist', async () => {
      prisma.experiment.findUnique.mockResolvedValue(null);

      await expect(service.getVoteSummary('unknown-experiment-id')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw NotFoundException if experiment is BLOCKED by safety rules', async () => {
      prisma.experiment.findUnique.mockResolvedValue({
        id: 'blocked-exp-id',
        safetyStatus: 'BLOCKED',
      });

      await expect(service.getVoteSummary('blocked-exp-id')).rejects.toThrow(NotFoundException);
    });
  });

  describe('3. deleteVote (Delete Authenticated Vote)', () => {
    it('should delete vote and decrement experiment voteCount by 1', async () => {
      prisma.experiment.findUnique.mockResolvedValue(mockExperimentRecord);
      prisma.vote.findUnique.mockResolvedValue(mockVoteRecord);
      prisma.vote.delete.mockResolvedValue(mockVoteRecord);
      prisma.experiment.update.mockResolvedValue({
        ...mockExperimentRecord,
        voteCount: mockExperimentRecord.voteCount - 1,
      });

      const result = await service.deleteVote(mockUserId, mockExperimentId);

      expect(prisma.vote.findUnique).toHaveBeenCalledWith({
        where: {
          unique_user_experiment_vote: {
            userId: mockUserId,
            experimentId: mockExperimentId,
          },
        },
      });
      expect(prisma.vote.delete).toHaveBeenCalledWith({
        where: { id: mockVoteId },
      });
      expect(prisma.experiment.update).toHaveBeenCalledWith({
        where: { id: mockExperimentId },
        data: {
          voteCount: { decrement: 1 },
        },
      });
      expect(result.success).toBe(true);
      expect(result.message).toBe('Vote deleted successfully');
    });

    it('should throw NotFoundException and NOT decrement voteCount if vote does not exist', async () => {
      prisma.experiment.findUnique.mockResolvedValue(mockExperimentRecord);
      prisma.vote.findUnique.mockResolvedValue(null);

      await expect(service.deleteVote(mockUserId, mockExperimentId)).rejects.toThrow(
        NotFoundException,
      );

      expect(prisma.vote.delete).not.toHaveBeenCalled();
      expect(prisma.experiment.update).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException if experiment does not exist', async () => {
      prisma.experiment.findUnique.mockResolvedValue(null);

      await expect(service.deleteVote(mockUserId, 'missing-experiment')).rejects.toThrow(
        NotFoundException,
      );

      expect(prisma.vote.delete).not.toHaveBeenCalled();
      expect(prisma.experiment.update).not.toHaveBeenCalled();
    });
  });

  describe('4. getUserVotes (Paginated User Voting History & Isolation)', () => {
    it('should return only authenticated user votes with pagination metadata', async () => {
      const mockVotes = [
        {
          id: 'vote-1',
          userId: mockUserId,
          experimentId: 'exp-1',
          choice: 'would_try',
          createdAt: new Date('2026-10-16T12:00:00Z'),
          updatedAt: new Date('2026-10-16T12:00:00Z'),
          experiment: { id: 'exp-1', title: 'Experiment 1' },
        },
        {
          id: 'vote-2',
          userId: mockUserId,
          experimentId: 'exp-2',
          choice: 'pass',
          createdAt: new Date('2026-10-15T12:00:00Z'),
          updatedAt: new Date('2026-10-15T12:00:00Z'),
          experiment: { id: 'exp-2', title: 'Experiment 2' },
        },
      ];

      prisma.vote.findMany.mockResolvedValue(mockVotes);
      prisma.vote.count.mockResolvedValue(2);

      const result = await service.getUserVotes(mockUserId, { page: 1, limit: 10 });

      // Verifies isolation: queried strictly by mockUserId
      expect(prisma.vote.findMany).toHaveBeenCalledWith({
        where: {
          userId: mockUserId,
          experiment: { safetyStatus: { not: 'BLOCKED' } },
        },
        include: {
          experiment: {
            select: {
              id: true,
              title: true,
            },
          },
        },
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        skip: 0,
        take: 10,
      });

      expect(result.items).toHaveLength(2);
      expect(result.total).toBe(2);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(10);
      expect(result.totalPages).toBe(1);
      expect(result.hasMore).toBe(false);
      expect(result.items[0]?.experiment?.title).toBe('Experiment 1');
    });

    it('should correctly calculate skip offset and hasMore for subsequent pages', async () => {
      prisma.vote.findMany.mockResolvedValue([]);
      prisma.vote.count.mockResolvedValue(25);

      const result = await service.getUserVotes(mockUserId, { page: 2, limit: 10 });

      expect(prisma.vote.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 10,
          take: 10,
        }),
      );
      expect(result.total).toBe(25);
      expect(result.totalPages).toBe(3);
      expect(result.hasMore).toBe(true);
    });

    it('should isolate other users votes completely', async () => {
      prisma.vote.findMany.mockResolvedValue([]);
      prisma.vote.count.mockResolvedValue(0);

      await service.getUserVotes(mockOtherUserId, { page: 1, limit: 20 });

      expect(prisma.vote.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            userId: mockOtherUserId,
            experiment: { safetyStatus: { not: 'BLOCKED' } },
          },
        }),
      );
    });
  });

  describe('5. DTO Validation Schemas', () => {
    it('should accept valid choices "would_try" and "pass"', () => {
      expect(castVoteSchema.safeParse({ choice: 'would_try' }).success).toBe(true);
      expect(castVoteSchema.safeParse({ choice: 'pass' }).success).toBe(true);
    });

    it('should reject invalid choices like "maybe", "like", or empty string', () => {
      expect(castVoteSchema.safeParse({ choice: 'maybe' }).success).toBe(false);
      expect(castVoteSchema.safeParse({ choice: 'like' }).success).toBe(false);
      expect(castVoteSchema.safeParse({ choice: '' }).success).toBe(false);
      expect(castVoteSchema.safeParse({ choice: 123 }).success).toBe(false);
      expect(castVoteSchema.safeParse({}).success).toBe(false);
    });

    it('should enforce pagination rules on userVotesQuerySchema', () => {
      const validQuery = userVotesQuerySchema.safeParse({ page: '2', limit: '15' });
      expect(validQuery.success).toBe(true);
      if (validQuery.success) {
        expect(validQuery.data.page).toBe(2);
        expect(validQuery.data.limit).toBe(15);
      }

      // Default values
      const defaultQuery = userVotesQuerySchema.safeParse({});
      expect(defaultQuery.success).toBe(true);
      if (defaultQuery.success) {
        expect(defaultQuery.data.page).toBe(1);
        expect(defaultQuery.data.limit).toBe(20);
      }

      // Invalid inputs
      expect(userVotesQuerySchema.safeParse({ page: 0 }).success).toBe(false);
      expect(userVotesQuerySchema.safeParse({ limit: 0 }).success).toBe(false);
      expect(userVotesQuerySchema.safeParse({ limit: 101 }).success).toBe(false);
    });
  });
});
