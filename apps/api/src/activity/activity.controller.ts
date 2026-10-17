import { Controller, Get, Query, HttpCode, HttpStatus } from '@nestjs/common';
import { ActivityService } from './activity.service';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { activityQuerySchema, type ActivityQueryDto } from './dto/activity-query.dto';
import type { PaginatedActivityResponse } from './dto/activity-response.dto';

@Controller('activity')
export class ActivityController {
  constructor(private readonly activityService: ActivityService) {}

  /**
   * GET /api/v1/activity
   * Public community activity feed with pagination and event-type filtering.
   * Upholds privacy (no private user data) and safety rules (no BLOCKED experiments).
   */
  @Get()
  @HttpCode(HttpStatus.OK)
  async getActivity(
    @Query(new ZodValidationPipe(activityQuerySchema)) query: ActivityQueryDto,
  ): Promise<PaginatedActivityResponse> {
    return this.activityService.getActivity(query);
  }
}
