export interface AppConfig {
  port: number;
  nodeEnv: string;
  corsOrigin: string;
  databaseUrl?: string;
  redisUrl?: string;
  jwtSecret: string;
  jwtExpiresIn: string;
}

export const configuration = (): AppConfig => ({
  port: parseInt(process.env['PORT'] ?? '4000', 10),
  nodeEnv: process.env['NODE_ENV'] ?? 'development',
  corsOrigin: process.env['CORS_ORIGIN'] ?? 'http://localhost:3000,http://localhost:8081',
  databaseUrl: process.env['DATABASE_URL'],
  redisUrl: process.env['REDIS_URL'],
  jwtSecret: process.env['JWT_SECRET'] ?? 'local-dev-jwt-secret-do-not-use-in-production-32bytes',
  jwtExpiresIn: process.env['JWT_EXPIRES_IN'] ?? '7d',
});
