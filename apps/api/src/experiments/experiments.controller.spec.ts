import { Test, TestingModule } from '@nestjs/testing';
import { ExperimentsController, UserExperimentsController } from './experiments.controller';
import { ExperimentsService } from './experiments.service';
import type { AuthenticatedUser } from '../auth/dto/auth-response.dto';

describe('ExperimentsControllers', () => {
  let experimentsController: ExperimentsController;
  let userExperimentsController: UserExperimentsController;
  let experimentsService: any;

  const mockUser: AuthenticatedUser = {
    userId: '11111111-1111-4111-8111-111111111111',
    username: 'creator_one',
  };

  const mockExperimentId = '22222222-2222-4222-8222-222222222222';

  beforeEach(async () => {
    experimentsService = {
      create: jest.fn(),
      findAll: jest.fn(),
      findOne: jest.fn(),
      remix: jest.fn(),
      getLineage: jest.fn(),
      getTree: jest.fn(),
      findMyExperiments: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ExperimentsController, UserExperimentsController],
      providers: [
        {
          provide: ExperimentsService,
          useValue: experimentsService,
        },
      ],
    }).compile();

    experimentsController = module.get<ExperimentsController>(ExperimentsController);
    userExperimentsController = module.get<UserExperimentsController>(UserExperimentsController);
  });

  describe('ExperimentsController', () => {
    describe('GET /experiments (Discovery Feed)', () => {
      it('should delegate to service.findAll with query parameters', async () => {
        const mockPaginated = {
          items: [],
          total: 0,
          page: 1,
          limit: 20,
          totalPages: 0,
          hasMore: false,
        };
        experimentsService.findAll.mockResolvedValue(mockPaginated);

        const query = {
          search: 'toast',
          difficulty: 'easy' as const,
          sort: 'trending' as const,
          page: 1,
          limit: 20,
        };
        const res = await experimentsController.findAll(query);

        expect(experimentsService.findAll).toHaveBeenCalledWith(query);
        expect(res).toEqual(mockPaginated);
      });
    });

    describe('GET /experiments/:id', () => {
      it('should delegate to service.findOne', async () => {
        const mockExp = { id: mockExperimentId, title: 'Test Experiment' };
        experimentsService.findOne.mockResolvedValue(mockExp);

        const res = await experimentsController.getOne(mockExperimentId);

        expect(experimentsService.findOne).toHaveBeenCalledWith(mockExperimentId);
        expect(res).toEqual(mockExp);
      });
    });
  });

  describe('UserExperimentsController', () => {
    describe('GET /users/me/experiments', () => {
      it('should delegate to service.findMyExperiments with authenticated userId', async () => {
        const mockPaginated = {
          items: [],
          total: 0,
          page: 1,
          limit: 10,
          totalPages: 0,
          hasMore: false,
        };
        experimentsService.findMyExperiments.mockResolvedValue(mockPaginated);

        const query = { page: 1, limit: 10 };
        const res = await userExperimentsController.findMyExperiments(mockUser, query);

        expect(experimentsService.findMyExperiments).toHaveBeenCalledWith(mockUser.userId, query);
        expect(res).toEqual(mockPaginated);
      });
    });
  });
});
