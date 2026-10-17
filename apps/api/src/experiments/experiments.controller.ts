import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ExperimentsService } from './experiments.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/dto/auth-response.dto';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { ParseExperimentIdPipe } from './pipes/parse-experiment-id.pipe';
import { createExperimentSchema, type CreateExperimentDto } from './dto/create-experiment.dto';
import { remixExperimentSchema, type RemixExperimentDto } from './dto/remix-experiment.dto';
import {
  experimentQuerySchema,
  type ExperimentQueryDto,
  userExperimentsQuerySchema,
  type UserExperimentsQueryDto,
} from './dto/experiment-query.dto';
import type {
  ExperimentResponse,
  PaginatedExperimentsResponse,
} from './dto/experiment-response.dto';
import type { LineageResponse } from './dto/lineage-response.dto';
import type { ExperimentTreeResponse } from './dto/tree-response.dto';

@Controller('experiments')
export class ExperimentsController {
  constructor(private readonly experimentsService: ExperimentsService) {}

  /**
   * POST /api/v1/experiments
   * Create a new root food experiment
   */
  @Post()
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.CREATED)
  async createRoot(
    @CurrentUser() user: AuthenticatedUser,
    @Body(new ZodValidationPipe(createExperimentSchema)) dto: CreateExperimentDto,
  ): Promise<ExperimentResponse> {
    return this.experimentsService.create(user.userId, dto);
  }

  /**
   * GET /api/v1/experiments
   * Public discovery feed for exploring food experiments with search, filters, and sorting
   */
  @Get()
  @HttpCode(HttpStatus.OK)
  async findAll(
    @Query(new ZodValidationPipe(experimentQuerySchema)) query: ExperimentQueryDto,
  ): Promise<PaginatedExperimentsResponse> {
    return this.experimentsService.findAll(query);
  }

  /**
   * GET /api/v1/experiments/feed/following
   * Personalized feed for authenticated users showing experiments from followed creators
   */
  @Get('feed/following')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async getFollowingFeed(
    @CurrentUser() user: AuthenticatedUser,
    @Query(new ZodValidationPipe(experimentQuerySchema)) query: ExperimentQueryDto,
  ): Promise<PaginatedExperimentsResponse> {
    return this.experimentsService.findFollowingFeed(user.userId, query);
  }

  /**
   * GET /api/v1/experiments/:id
   * Get experiment details with ingredients, creator, and stats
   */
  @Get(':id')
  @HttpCode(HttpStatus.OK)
  async getOne(@Param('id', ParseExperimentIdPipe) id: string): Promise<ExperimentResponse> {
    return this.experimentsService.findOne(id);
  }

  /**
   * POST /api/v1/experiments/:id/remix
   * Branch / Remix an existing food experiment
   */
  @Post(':id/remix')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.CREATED)
  async remix(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseExperimentIdPipe) id: string,
    @Body(new ZodValidationPipe(remixExperimentSchema)) dto: RemixExperimentDto,
  ): Promise<ExperimentResponse> {
    return this.experimentsService.remix(id, user.userId, dto);
  }

  /**
   * GET /api/v1/experiments/:id/lineage
   * Retrieve the ancestor chain from target experiment up to root
   */
  @Get(':id/lineage')
  @HttpCode(HttpStatus.OK)
  async getLineage(@Param('id', ParseExperimentIdPipe) id: string): Promise<LineageResponse> {
    return this.experimentsService.getLineage(id);
  }

  /**
   * GET /api/v1/experiments/:id/tree
   * Retrieve the branching Living Food Graph tree of the experiment family
   */
  @Get(':id/tree')
  @HttpCode(HttpStatus.OK)
  async getTree(@Param('id', ParseExperimentIdPipe) id: string): Promise<ExperimentTreeResponse> {
    return this.experimentsService.getTree(id);
  }
}

/**
 * Controller for Authenticated User Experiment Management (/api/v1/users/me/experiments)
 */
@Controller('users')
export class UserExperimentsController {
  constructor(private readonly experimentsService: ExperimentsService) {}

  /**
   * GET /api/v1/users/me/experiments
   * List current authenticated user's own created experiments with pagination
   */
  @Get('me/experiments')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async findMyExperiments(
    @CurrentUser() user: AuthenticatedUser,
    @Query(new ZodValidationPipe(userExperimentsQuerySchema)) query: UserExperimentsQueryDto,
  ): Promise<PaginatedExperimentsResponse> {
    return this.experimentsService.findMyExperiments(user.userId, query);
  }

  /**
   * GET /api/v1/users/me/following-feed
   * List experiments from followed creators for the authenticated user
   */
  @Get('me/following-feed')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async getFollowingFeed(
    @CurrentUser() user: AuthenticatedUser,
    @Query(new ZodValidationPipe(experimentQuerySchema)) query: ExperimentQueryDto,
  ): Promise<PaginatedExperimentsResponse> {
    return this.experimentsService.findFollowingFeed(user.userId, query);
  }
}
