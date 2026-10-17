import { PipeTransform, Injectable, BadRequestException } from '@nestjs/common';

@Injectable()
export class ParseUsernamePipe implements PipeTransform<string, string> {
  transform(value: string): string {
    if (!value || typeof value !== 'string') {
      throw new BadRequestException('Username parameter is required');
    }
    const trimmed = value.trim();
    if (trimmed.length < 3 || trimmed.length > 50) {
      throw new BadRequestException('Username must be between 3 and 50 characters');
    }
    if (!/^[a-zA-Z0-9_-]+$/.test(trimmed)) {
      throw new BadRequestException(
        'Username can only contain alphanumeric characters, underscores, and hyphens',
      );
    }
    return trimmed;
  }
}
