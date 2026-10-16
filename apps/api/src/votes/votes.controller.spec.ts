import { Test, TestingModule } from '@nestjs/testing';
import { HttpStatus } from '@nestjs/common';
import { ExperimentVotesController, UserVotesController } from './votes.controller';
import { VotesService } from './votes.service';
import type { AuthenticatedUser } from '../auth/dto/auth-response.dto';

describe('VotesControllers', () => {
  let experimentVotesController: ExperimentVotesController;
  let userVotesController: UserVotesController;
  let votesService: any;

  const mockUser: AuthenticatedUser = {
    userId: '11111111-1111-4111-8111-111111111111',
    username: 'voter_one',
  };

  const mockExperimentId = '33333333-3333-4333-8333-333333333333';

  beforeEach(async () => {
    votesService = {
      castVote: jest.fn(),
      getVoteSummary: jest.fn(),
      deleteVote: jest.fn(),
      getUserVotes: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ExperimentVotesController, UserVotesController],
      providers: [
        {
          provide: VotesService,
          useValue: votesService,
        },
      ],
    }).compile();

    experimentVotesController = module.get<ExperimentVotesController>(ExperimentVotesController);
    userVotesController = module.get<UserVotesController>(UserVotesController);
  });

  describe('ExperimentVotesController', () => {
    describe('POST :experimentId/votes', () => {
      it('should set status 201 when new vote is created', async () => {
        const mockResponse: any = {
          status: jest.fn().mockReturnThis(),
        };

        votesService.castVote.mockResolvedValue({
          vote: {
            id: 'v1',
            userId: mockUser.userId,
            experimentId: mockExperimentId,
            choice: 'would_try',
            createdAt: '2026-10-16T10:00:00.000Z',
            updatedAt: '2026-10-16T10:00:00.000Z',
          },
          isNew: true,
        });

        const res = await experimentVotesController.castVote(
          mockUser,
          mockExperimentId,
          { choice: 'would_try' },
          mockResponse,
        );

        expect(votesService.castVote).toHaveBeenCalledWith(
          mockUser.userId,
          mockExperimentId,
          'would_try',
        );
        expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.CREATED);
        expect(res.id).toBe('v1');
      });

      it('should set status 200 when vote is updated', async () => {
        const mockResponse: any = {
          status: jest.fn().mockReturnThis(),
        };

        votesService.castVote.mockResolvedValue({
          vote: {
            id: 'v1',
            userId: mockUser.userId,
            experimentId: mockExperimentId,
            choice: 'pass',
            createdAt: '2026-10-16T10:00:00.000Z',
            updatedAt: '2026-10-16T10:05:00.000Z',
          },
          isNew: false,
        });

        const res = await experimentVotesController.castVote(
          mockUser,
          mockExperimentId,
          { choice: 'pass' },
          mockResponse,
        );

        expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.OK);
        expect(res.choice).toBe('pass');
      });
    });

    describe('GET :experimentId/votes', () => {
      it('should return summary with userVote when authenticated', async () => {
        const mockSummary = {
          experimentId: mockExperimentId,
          wouldTryCount: 10,
          passCount: 2,
          totalVotes: 12,
          userVote: 'would_try',
        };
        votesService.getVoteSummary.mockResolvedValue(mockSummary);

        const res = await experimentVotesController.getVoteSummary(mockExperimentId, mockUser);

        expect(votesService.getVoteSummary).toHaveBeenCalledWith(mockExperimentId, mockUser.userId);
        expect(res).toEqual(mockSummary);
      });

      it('should return summary without userVote when unauthenticated', async () => {
        const mockSummary = {
          experimentId: mockExperimentId,
          wouldTryCount: 10,
          passCount: 2,
          totalVotes: 12,
        };
        votesService.getVoteSummary.mockResolvedValue(mockSummary);

        const res = await experimentVotesController.getVoteSummary(mockExperimentId, undefined);

        expect(votesService.getVoteSummary).toHaveBeenCalledWith(mockExperimentId, undefined);
        expect(res).toEqual(mockSummary);
      });
    });

    describe('DELETE :experimentId/votes', () => {
      it('should delegate to service.deleteVote with authenticated user ID', async () => {
        votesService.deleteVote.mockResolvedValue({
          success: true,
          message: 'Vote deleted successfully',
        });

        const res = await experimentVotesController.deleteVote(mockUser, mockExperimentId);

        expect(votesService.deleteVote).toHaveBeenCalledWith(mockUser.userId, mockExperimentId);
        expect(res.success).toBe(true);
      });
    });
  });

  describe('UserVotesController', () => {
    describe('GET me/votes', () => {
      it('should delegate to service.getUserVotes with authenticated userId only', async () => {
        const mockPaginated = {
          items: [],
          total: 0,
          page: 1,
          limit: 20,
          totalPages: 0,
          hasMore: false,
        };
        votesService.getUserVotes.mockResolvedValue(mockPaginated);

        const query = { page: 1, limit: 20 };
        const res = await userVotesController.getMyVotes(mockUser, query);

        expect(votesService.getUserVotes).toHaveBeenCalledWith(mockUser.userId, query);
        expect(res).toEqual(mockPaginated);
      });
    });
  });
});
