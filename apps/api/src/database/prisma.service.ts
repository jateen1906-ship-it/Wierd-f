import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  constructor(private readonly configService: ConfigService) {
    const databaseUrl = configService.get<string>('databaseUrl');
    super({
      datasources: databaseUrl
        ? {
            db: {
              url: databaseUrl,
            },
          }
        : undefined,
      log: process.env['NODE_ENV'] === 'development' ? ['error', 'warn'] : ['error'],
    });
  }

  async onModuleInit(): Promise<void> {
    const databaseUrl = this.configService.get<string>('databaseUrl');
    if (!databaseUrl) {
      this.logger.error(
        'DATABASE_URL configuration is missing. PrismaService connection cannot be established.',
      );
      throw new Error(
        'DATABASE_URL configuration is required to initialize Prisma database service.',
      );
    }

    try {
      await this.$connect();
      this.logger.log('Successfully connected to PostgreSQL database');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown database error';
      this.logger.error(`Failed to connect to PostgreSQL database: ${errorMessage}`);
      throw error;
    }
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
    this.logger.log('Disconnected from PostgreSQL database');
  }
}
