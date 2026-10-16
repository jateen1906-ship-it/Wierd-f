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
import { ReactionsService } from './reactions.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { OptionalJwtAuthGuard } from '../auth/guards/optional-jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/dto/auth-response.dto';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { ParseCookingResultIdPipe } from './pipes/parse-cooking-result-id.pipe';
import {
  castReactionSchema,
  extractReactionType,
  type CastReactionDto,
} from './dto/cast-reaction.dto';
import {
  userReactionsQuerySchema,
  type UserReactionsQueryDto,
} from './dto/user-reactions-query.dto';
import type {
  CookingResultReactionResponse,
  CookingResultReactionSummaryResponse,
  PaginatedUserReactionsResponse,
} from './dto/reaction-response.dto';

/**
 * Controller for Cooking Result Reaction Endpoints (/api/v1/cooking-results/:resultId/reactions)
 */
@Controller('cooking-results')
export class CookingResultReactionsController {
  constructor(private readonly reactionsService: ReactionsService) {}

  /**
   * POST /api/v1/cooking-results/:resultId/reactions
   * Cast a new reaction or update an existing reaction on a cooking result
   * Returns 201 Created for new reactions and 200 OK for updates
   */
  @Post(':resultId/reactions')
  @UseGuards(JwtAuthGuard)
  async castReaction(
    @CurrentUser() user: AuthenticatedUser,
    @Param('resultId', ParseCookingResultIdPipe) resultId: string,
    @Body(new ZodValidationPipe(castReactionSchema)) dto: CastReactionDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<CookingResultReactionResponse> {
    const type = extractReactionType(dto);
    const result = await this.reactionsService.castReaction(user.userId, resultId, type);
    res.status(result.isNew ? HttpStatus.CREATED : HttpStatus.OK);
    return result.reaction;
  }

  /**
   * GET /api/v1/cooking-results/:resultId/reactions
   * Retrieve aggregate reaction summary for a cooking result
   * Public endpoint with optional JWT authentication
   */
  @Get(':resultId/reactions')
  @UseGuards(OptionalJwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async getReactionSummary(
    @Param('resultId', ParseCookingResultIdPipe) resultId: string,
    @CurrentUser() user?: AuthenticatedUser,
  ): Promise<CookingResultReactionSummaryResponse> {
    return this.reactionsService.getReactionSummary(resultId, user?.userId);
  }

  /**
   * DELETE /api/v1/cooking-results/:resultId/reactions
   * Delete authenticated user's reaction on a cooking result
   */
  @Delete(':resultId/reactions')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async deleteReaction(
    @CurrentUser() user: AuthenticatedUser,
    @Param('resultId', ParseCookingResultIdPipe) resultId: string,
  ): Promise<{ success: boolean; message: string }> {
    return this.reactionsService.deleteReaction(user.userId, resultId);
  }
}

/**
 * Controller for Authenticated User Reaction History (/api/v1/users/me/reactions)
 */
@Controller('users')
export class UserReactionsController {
  constructor(private readonly reactionsService: ReactionsService) {}

  /**
   * GET /api/v1/users/me/reactions
   * Retrieve caller's paginated reaction history
   * Strictly isolated to the authenticated caller's userId
   */
  @Get('me/reactions')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async getMyReactions(
    @CurrentUser() user: AuthenticatedUser,
    @Query(new ZodValidationPipe(userReactionsQuerySchema)) query: UserReactionsQueryDto,
  ): Promise<PaginatedUserReactionsResponse> {
    return this.reactionsService.getUserReactions(user.userId, query);
  }
}
