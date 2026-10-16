import { Logger, VersioningType } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { json, urlencoded } from 'express';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters/http-exception.filter';

async function bootstrap(): Promise<void> {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn', 'log', 'debug', 'verbose'],
  });

  const configService = app.get(ConfigService);
  const port = configService.get<number>('port', 4000);
  const nodeEnv = configService.get<string>('nodeEnv', 'development');
  const corsOriginEnv = configService.get<string>(
    'corsOrigin',
    'http://localhost:3000,http://localhost:8081',
  );

  // 1. Request Body Limits
  app.use(json({ limit: '10mb' }));
  app.use(urlencoded({ extended: true, limit: '10mb' }));

  // 2. Global Exception Filter (Sanitized Responses)
  app.useGlobalFilters(new AllExceptionsFilter());

  // 3. CORS Configuration
  const allowedOrigins = corsOriginEnv
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  app.enableCors({
    origin: allowedOrigins.includes('*') ? true : allowedOrigins,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
    credentials: true,
  });

  // 4. Global API Prefix (excluding health check)
  app.setGlobalPrefix('api', {
    exclude: ['health'],
  });

  // 5. API Versioning
  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: '1',
  });

  // 6. Graceful Shutdown
  app.enableShutdownHooks();

  await app.listen(port);
  logger.log(`====================================================`);
  logger.log(`Social Food Evolution API running on port: ${port}`);
  logger.log(`Environment: ${nodeEnv}`);
  logger.log(`Health endpoint: http://localhost:${port}/health`);
  logger.log(`API base route:  http://localhost:${port}/api/v1`);
  logger.log(`====================================================`);
}

void bootstrap();
