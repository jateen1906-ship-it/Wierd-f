export interface AppConfig {
  port: number;
  nodeEnv: string;
  corsOrigin: string;
  databaseUrl?: string;
  redisUrl?: string;
  jwtSecret: string;
  jwtExpiresIn: string;
}

export const INSECURE_DEV_JWT_SECRET = 'local-dev-jwt-secret-do-not-use-in-production-32bytes';

/**
 * Validates configuration parameters for production readiness.
 * Enforces strong security invariants: no default secrets, no wildcard CORS with credentials,
 * and verified database connectivity strings.
 */
export function validateProductionConfig(config: AppConfig): void {
  if (config.nodeEnv === 'production') {
    if (
      !config.jwtSecret ||
      config.jwtSecret === INSECURE_DEV_JWT_SECRET ||
      config.jwtSecret.length < 32
    ) {
      throw new Error(
        'Production configuration error: JWT_SECRET must be securely set to a custom secret with at least 32 characters in production.',
      );
    }

    if (!config.databaseUrl || config.databaseUrl.trim().length === 0) {
      throw new Error(
        'Production configuration error: DATABASE_URL is required to be set in production.',
      );
    }

    const origins = config.corsOrigin.split(',').map((o) => o.trim());
    if (origins.includes('*')) {
      throw new Error(
        'Production configuration error: CORS_ORIGIN cannot contain wildcard "*" when credentials are enabled in production.',
      );
    }
  }

  if (isNaN(config.port) || config.port < 1 || config.port > 65535) {
    throw new Error(`Invalid port configured: ${config.port}`);
  }
}

export const configuration = (): AppConfig => {
  const config: AppConfig = {
    port: parseInt(process.env['PORT'] ?? '4000', 10),
    nodeEnv: process.env['NODE_ENV'] ?? 'development',
    corsOrigin: process.env['CORS_ORIGIN'] ?? 'http://localhost:3000,http://localhost:8081',
    databaseUrl: process.env['DATABASE_URL'],
    redisUrl: process.env['REDIS_URL'],
    jwtSecret: process.env['JWT_SECRET'] ?? INSECURE_DEV_JWT_SECRET,
    jwtExpiresIn: process.env['JWT_EXPIRES_IN'] ?? '7d',
  };

  validateProductionConfig(config);

  return config;
};
