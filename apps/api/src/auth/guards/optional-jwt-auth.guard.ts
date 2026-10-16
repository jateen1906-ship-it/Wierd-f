import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/**
 * Optional JWT Authentication Guard.
 * Allows public access when no or invalid Authorization header is supplied,
 * while still populating `req.user` when a valid JWT bearer token is present.
 */
@Injectable()
export class OptionalJwtAuthGuard extends AuthGuard('jwt') {
  override handleRequest<TUser = unknown>(_err: unknown, user: TUser): TUser | null {
    // If authentication fails or token is missing, return null instead of throwing UnauthorizedException.
    return user || null;
  }
}
