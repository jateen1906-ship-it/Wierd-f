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
import { CookingResultsService } from './cooking-results.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/dto/auth-response.dto';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { ParseCookingResultIdPipe } from './pipes/parse-cooking-result-id.pipe';
import { ParseExperimentIdPipe } from '../experiments/pipes/parse-experiment-id.pipe';
import {
  createCookingResultSchema,
  type CreateCookingResultDto,
} from './dto/create-cooking-result.dto';
import {
  cookingResultQuerySchema,
  type CookingResultQueryDto,
} from './dto/cooking-result-query.dto';
import type {
  CookingResultResponse,
  PaginatedCookingResultsResponse,
} from './dto/cooking-result-response.dto';

/**
 * Controller for Cooking Results primary endpoints (/api/v1/cooking-results)
 */
@Controller('cooking-results')
export class CookingResultsController {
  constructor(private readonly cookingResultsService: CookingResultsService) {}

  /**
   * POST /api/v1/cooking-results
   * Create a new real-world cooking result
   * Creator identity is strictly derived from the authenticated JWT token
   */
  @Post()
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.CREATED)
  async create(
    @CurrentUser() user: AuthenticatedUser,
    @Body(new ZodValidationPipe(createCookingResultSchema)) dto: CreateCookingResultDto,
  ): Promise<CookingResultResponse> {
    return this.cookingResultsService.create(user.userId, dto);
  }

  /**
   * GET /api/v1/cooking-results/:id
   * Retrieve a single cooking result by its unique identifier
   */
  @Get(':id')
  @HttpCode(HttpStatus.OK)
  async findOne(@Param('id', ParseCookingResultIdPipe) id: string): Promise<CookingResultResponse> {
    return this.cookingResultsService.findOne(id);
  }

  /**
   * GET /api/v1/cooking-results
   * List cooking results with optional query parameters (experimentId, userId, page, limit)
   */
  @Get()
  @HttpCode(HttpStatus.OK)
  async findAll(
    @Query(new ZodValidationPipe(cookingResultQuerySchema)) query: CookingResultQueryDto,
  ): Promise<PaginatedCookingResultsResponse> {
    return this.cookingResultsService.findAll(query);
  }
}

/**
 * Controller for Experiment-specific Cooking Results (/api/v1/experiments/:experimentId/cooking-results)
 */
@Controller('experiments')
export class ExperimentCookingResultsController {
  constructor(private readonly cookingResultsService: CookingResultsService) {}

  /**
   * GET /api/v1/experiments/:experimentId/cooking-results
   * List cooking results for a specific experiment with pagination
   */
  @Get(':experimentId/cooking-results')
  @HttpCode(HttpStatus.OK)
  async findByExperiment(
    @Param('experimentId', ParseExperimentIdPipe) experimentId: string,
    @Query(new ZodValidationPipe(cookingResultQuerySchema)) query: CookingResultQueryDto,
  ): Promise<PaginatedCookingResultsResponse> {
    return this.cookingResultsService.findByExperiment(experimentId, query);
  }
}

/**
 * Controller for Authenticated User Cooking Results (/api/v1/users/me/cooking-results)
 */
@Controller('users')
export class UserCookingResultsController {
  constructor(private readonly cookingResultsService: CookingResultsService) {}

  /**
   * GET /api/v1/users/me/cooking-results
   * List current authenticated user's own cooking results with pagination
   */
  @Get('me/cooking-results')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async findMyResults(
    @CurrentUser() user: AuthenticatedUser,
    @Query(new ZodValidationPipe(cookingResultQuerySchema)) query: CookingResultQueryDto,
  ): Promise<PaginatedCookingResultsResponse> {
    return this.cookingResultsService.findByUser(user.userId, query);
  }
}
