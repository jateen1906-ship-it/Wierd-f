import {
  Controller,
  Get,
  Patch,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  ParseIntPipe,
  DefaultValuePipe,
  ParseUUIDPipe,
} from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/dto/auth-response.dto';
import type {
  PaginatedNotificationsResponse,
  NotificationItem,
  UnreadCountResponse,
} from './dto/notification-response.dto';

@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  /**
   * GET /api/v1/notifications
   * List paginated notifications for the authenticated user
   */
  @Get()
  @HttpCode(HttpStatus.OK)
  async getNotifications(
    @CurrentUser() user: AuthenticatedUser,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
  ): Promise<PaginatedNotificationsResponse> {
    return this.notificationsService.getNotifications(user.userId, page, limit);
  }

  /**
   * GET /api/v1/notifications/unread-count
   * Retrieve unread notifications count for current user
   */
  @Get('unread-count')
  @HttpCode(HttpStatus.OK)
  async getUnreadCount(@CurrentUser() user: AuthenticatedUser): Promise<UnreadCountResponse> {
    const unreadCount = await this.notificationsService.getUnreadCount(user.userId);
    return { unreadCount };
  }

  /**
   * PATCH /api/v1/notifications/read-all
   * Mark all notifications as read for current user
   * Placed before :id/read to prevent route parameter collision
   */
  @Patch('read-all')
  @HttpCode(HttpStatus.OK)
  async markAllAsRead(@CurrentUser() user: AuthenticatedUser): Promise<{ count: number }> {
    return this.notificationsService.markAllAsRead(user.userId);
  }

  /**
   * PATCH /api/v1/notifications/:id/read
   * Mark a single notification as read
   */
  @Patch(':id/read')
  @HttpCode(HttpStatus.OK)
  async markAsRead(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<NotificationItem> {
    return this.notificationsService.markAsRead(user.userId, id);
  }
}
