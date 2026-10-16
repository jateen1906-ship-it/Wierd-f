import { Injectable, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  override handleRequest<TUser = unknown>(err: unknown, user: TUser, info: unknown): TUser {
    if (err || !user) {
      const message =
        info instanceof Error ? info.message : 'Missing or invalid authentication token';
      throw new UnauthorizedException(message);
    }
    return user;
  }
}
