import {
  Controller,
  Post,
  Get,
  Body,
  Param,
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
import type { ExperimentResponse } from './dto/experiment-response.dto';
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
