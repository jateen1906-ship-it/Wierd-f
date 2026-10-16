import {
  Controller,
  Post,
  Get,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  Res,
} from '@nestjs/common';
import type { Response } from 'express';
import { VotesService } from './votes.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { OptionalJwtAuthGuard } from '../auth/guards/optional-jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/dto/auth-response.dto';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { ParseExperimentIdPipe } from '../experiments/pipes/parse-experiment-id.pipe';
import { castVoteSchema, type CastVoteDto } from './dto/cast-vote.dto';
import { userVotesQuerySchema, type UserVotesQueryDto } from './dto/user-votes-query.dto';
import type {
  VoteResponse,
  ExperimentVoteSummaryResponse,
  PaginatedUserVotesResponse,
} from './dto/vote-response.dto';

/**
 * Controller for Experiment Community Voting Endpoints (/api/v1/experiments/:experimentId/votes)
 */
@Controller('experiments')
export class ExperimentVotesController {
  constructor(private readonly votesService: VotesService) {}

  /**
   * POST /api/v1/experiments/:experimentId/votes
   * Cast a new vote or update an existing vote ('would_try' | 'pass')
   * Authenticated user ID is strictly derived from the verified JWT
   */
  @Post(':experimentId/votes')
  @UseGuards(JwtAuthGuard)
  async castVote(
    @CurrentUser() user: AuthenticatedUser,
    @Param('experimentId', ParseExperimentIdPipe) experimentId: string,
    @Body(new ZodValidationPipe(castVoteSchema)) dto: CastVoteDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<VoteResponse> {
    const result = await this.votesService.castVote(user.userId, experimentId, dto.choice);
    res.status(result.isNew ? HttpStatus.CREATED : HttpStatus.OK);
    return result.vote;
  }

  /**
   * GET /api/v1/experiments/:experimentId/votes
   * Retrieve aggregate vote summary (wouldTryCount, passCount, totalVotes)
   * Publicly accessible, but includes caller's userVote when authenticated
   */
  @Get(':experimentId/votes')
  @UseGuards(OptionalJwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async getVoteSummary(
    @Param('experimentId', ParseExperimentIdPipe) experimentId: string,
    @CurrentUser() user?: AuthenticatedUser,
  ): Promise<ExperimentVoteSummaryResponse> {
    return this.votesService.getVoteSummary(experimentId, user?.userId);
  }

  /**
   * DELETE /api/v1/experiments/:experimentId/votes
   * Remove the authenticated user's vote on the experiment
   * Decrements Experiment.voteCount only if a vote existed
   */
  @Delete(':experimentId/votes')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async deleteVote(
    @CurrentUser() user: AuthenticatedUser,
    @Param('experimentId', ParseExperimentIdPipe) experimentId: string,
  ): Promise<{ success: boolean; message: string }> {
    return this.votesService.deleteVote(user.userId, experimentId);
  }
}

/**
 * Controller for User Voting History Endpoints (/api/v1/users/me/votes)
 */
@Controller('users')
export class UserVotesController {
  constructor(private readonly votesService: VotesService) {}

  /**
   * GET /api/v1/users/me/votes
   * Retrieve the authenticated user's voting history with pagination
   * Strictly isolated to the authenticated caller's userId
   */
  @Get('me/votes')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async getMyVotes(
    @CurrentUser() user: AuthenticatedUser,
    @Query(new ZodValidationPipe(userVotesQuerySchema)) query: UserVotesQueryDto,
  ): Promise<PaginatedUserVotesResponse> {
    return this.votesService.getUserVotes(user.userId, query);
  }
}
