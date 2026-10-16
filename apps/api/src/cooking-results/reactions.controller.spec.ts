import { Test, TestingModule } from '@nestjs/testing';
import { HttpStatus } from '@nestjs/common';
import { CookingResultReactionsController, UserReactionsController } from './reactions.controller';
import { ReactionsService } from './reactions.service';
import type { AuthenticatedUser } from '../auth/dto/auth-response.dto';

describe('ReactionsControllers', () => {
  let cookingResultReactionsController: CookingResultReactionsController;
  let userReactionsController: UserReactionsController;
  let reactionsService: any;

  const mockUser: AuthenticatedUser = {
    userId: '11111111-1111-4111-8111-111111111111',
    username: 'reactor_one',
  };

  const mockResultId = '33333333-3333-4333-8333-333333333333';

  beforeEach(async () => {
    reactionsService = {
      castReaction: jest.fn(),
      getReactionSummary: jest.fn(),
      deleteReaction: jest.fn(),
      getUserReactions: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [CookingResultReactionsController, UserReactionsController],
      providers: [
        {
          provide: ReactionsService,
          useValue: reactionsService,
        },
      ],
    }).compile();

    cookingResultReactionsController = module.get<CookingResultReactionsController>(
      CookingResultReactionsController,
    );
    userReactionsController = module.get<UserReactionsController>(UserReactionsController);
  });

  describe('CookingResultReactionsController', () => {
    describe('POST :resultId/reactions', () => {
      it('should set status 201 when new reaction is created', async () => {
        const mockResponse: any = {
          status: jest.fn().mockReturnThis(),
        };

        reactionsService.castReaction.mockResolvedValue({
          reaction: {
            id: 'rx-1',
            userId: mockUser.userId,
            resultId: mockResultId,
            type: 'fire',
            createdAt: '2026-10-17T00:00:00.000Z',
            updatedAt: '2026-10-17T00:00:00.000Z',
          },
          isNew: true,
        });

        const res = await cookingResultReactionsController.castReaction(
          mockUser,
          mockResultId,
          { type: 'fire' },
          mockResponse,
        );

        expect(reactionsService.castReaction).toHaveBeenCalledWith(
          mockUser.userId,
          mockResultId,
          'fire',
        );
        expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.CREATED);
        expect(res.id).toBe('rx-1');
      });

      it('should set status 200 when reaction is updated', async () => {
        const mockResponse: any = {
          status: jest.fn().mockReturnThis(),
        };

        reactionsService.castReaction.mockResolvedValue({
          reaction: {
            id: 'rx-1',
            userId: mockUser.userId,
            resultId: mockResultId,
            type: 'respect',
            createdAt: '2026-10-17T00:00:00.000Z',
            updatedAt: '2026-10-17T00:05:00.000Z',
          },
          isNew: false,
        });

        const res = await cookingResultReactionsController.castReaction(
          mockUser,
          mockResultId,
          { choice: 'respect' },
          mockResponse,
        );

        expect(reactionsService.castReaction).toHaveBeenCalledWith(
          mockUser.userId,
          mockResultId,
          'respect',
        );
        expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.OK);
        expect(res.type).toBe('respect');
      });
    });

    describe('GET :resultId/reactions', () => {
      it('should return summary with userReaction when authenticated', async () => {
        const mockSummary = {
          resultId: mockResultId,
          fireCount: 3,
          yuckCount: 0,
          respectCount: 2,
          laughCount: 1,
          mindBlownCount: 0,
          totalReactions: 6,
          likesCount: 6,
          userReaction: 'fire',
        };
        reactionsService.getReactionSummary.mockResolvedValue(mockSummary);

        const res = await cookingResultReactionsController.getReactionSummary(
          mockResultId,
          mockUser,
        );

        expect(reactionsService.getReactionSummary).toHaveBeenCalledWith(
          mockResultId,
          mockUser.userId,
        );
        expect(res).toEqual(mockSummary);
      });

      it('should return summary without userReaction when unauthenticated', async () => {
        const mockSummary = {
          resultId: mockResultId,
          fireCount: 3,
          yuckCount: 0,
          respectCount: 2,
          laughCount: 1,
          mindBlownCount: 0,
          totalReactions: 6,
          likesCount: 6,
        };
        reactionsService.getReactionSummary.mockResolvedValue(mockSummary);

        const res = await cookingResultReactionsController.getReactionSummary(
          mockResultId,
          undefined,
        );

        expect(reactionsService.getReactionSummary).toHaveBeenCalledWith(mockResultId, undefined);
        expect(res).toEqual(mockSummary);
      });
    });

    describe('DELETE :resultId/reactions', () => {
      it('should delete reaction with authenticated user ID', async () => {
        reactionsService.deleteReaction.mockResolvedValue({
          success: true,
          message: 'Reaction deleted successfully',
        });

        const res = await cookingResultReactionsController.deleteReaction(mockUser, mockResultId);

        expect(reactionsService.deleteReaction).toHaveBeenCalledWith(mockUser.userId, mockResultId);
        expect(res.success).toBe(true);
      });
    });
  });

  describe('UserReactionsController', () => {
    describe('GET me/reactions', () => {
      it('should return caller reactions using authenticated userId only', async () => {
        const mockPaginated = {
          items: [],
          total: 0,
          page: 1,
          limit: 20,
          totalPages: 0,
          hasMore: false,
        };
        reactionsService.getUserReactions.mockResolvedValue(mockPaginated);

        const query = { page: 1, limit: 20 };
        const res = await userReactionsController.getMyReactions(mockUser, query);

        expect(reactionsService.getUserReactions).toHaveBeenCalledWith(mockUser.userId, query);
        expect(res).toEqual(mockPaginated);
      });
    });
  });
});
