import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  ParseIntPipe,
  DefaultValuePipe,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { ParseUsernamePipe } from './pipes/parse-username.pipe';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { OptionalJwtAuthGuard } from '../auth/guards/optional-jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/dto/auth-response.dto';
import type {
  PublicUserProfileResponse,
  FollowActionResult,
  PaginatedFollowingResponse,
} from './dto/public-profile-response.dto';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  /**
   * GET /api/v1/users/me/following
   * Retrieve paginated list of creators followed by authenticated caller.
   * Defined before :username route to prevent route collision.
   */
  @Get('me/following')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async getMyFollowing(
    @CurrentUser() user: AuthenticatedUser,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
  ): Promise<PaginatedFollowingResponse> {
    return this.usersService.getFollowingList(user.userId, page, limit);
  }

  /**
   * POST /api/v1/users/:username/follow
   * Follow a public creator by username.
   */
  @Post(':username/follow')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async follow(
    @CurrentUser() user: AuthenticatedUser,
    @Param('username', ParseUsernamePipe) username: string,
  ): Promise<FollowActionResult> {
    return this.usersService.followUser(user.userId, username);
  }

  /**
   * DELETE /api/v1/users/:username/follow
   * Unfollow a public creator by username.
   */
  @Delete(':username/follow')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async unfollow(
    @CurrentUser() user: AuthenticatedUser,
    @Param('username', ParseUsernamePipe) username: string,
  ): Promise<FollowActionResult> {
    return this.usersService.unfollowUser(user.userId, username);
  }

  /**
   * GET /api/v1/users/profile/:username
   * Retrieve sanitized public creator profile by username.
   * Includes caller's isFollowing status when authenticated.
   */
  @Get('profile/:username')
  @UseGuards(OptionalJwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async getProfile(
    @Param('username', ParseUsernamePipe) username: string,
    @CurrentUser() user?: AuthenticatedUser,
  ): Promise<PublicUserProfileResponse> {
    return this.usersService.getPublicProfile(username, user?.userId);
  }

  /**
   * GET /api/v1/users/:username
   * Canonical alias for public creator profile.
   * Includes caller's isFollowing status when authenticated.
   */
  @Get(':username')
  @UseGuards(OptionalJwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async getByUsername(
    @Param('username', ParseUsernamePipe) username: string,
    @CurrentUser() user?: AuthenticatedUser,
  ): Promise<PublicUserProfileResponse> {
    return this.usersService.getPublicProfile(username, user?.userId);
  }
}
