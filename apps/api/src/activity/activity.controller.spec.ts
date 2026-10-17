import { Test, TestingModule } from '@nestjs/testing';
import { ActivityController } from './activity.controller';
import { ActivityService } from './activity.service';

describe('ActivityController', () => {
  let controller: ActivityController;
  let service: {
    getActivity: jest.Mock;
  };

  beforeEach(async () => {
    service = {
      getActivity: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ActivityController],
      providers: [
        {
          provide: ActivityService,
          useValue: service,
        },
      ],
    }).compile();

    controller = module.get<ActivityController>(ActivityController);
  });

  describe('GET /activity', () => {
    it('delegates to activityService.getActivity with query options', async () => {
      const mockResult = {
        items: [],
        total: 0,
        page: 1,
        limit: 20,
        totalPages: 0,
        hasMore: false,
      };
      service.getActivity.mockResolvedValue(mockResult);

      const query = { page: 1, limit: 20, type: 'all' as const };
      const res = await controller.getActivity(query);

      expect(res).toBe(mockResult);
      expect(service.getActivity).toHaveBeenCalledWith(query);
    });
  });
});
