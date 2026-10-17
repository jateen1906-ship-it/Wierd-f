import { validateProductionConfig, INSECURE_DEV_JWT_SECRET, type AppConfig } from './configuration';

describe('Configuration Security & Production Validation', () => {
  const validProdConfig: AppConfig = {
    port: 4000,
    nodeEnv: 'production',
    corsOrigin: 'https://wierd.food,https://app.wierd.food',
    databaseUrl: 'postgresql://prod_user:secret@db.prod.internal:5432/wierd_prod?sslmode=require',
    redisUrl: 'rediss://redis.prod.internal:6380',
    jwtSecret: 'production-super-secure-jwt-secret-key-32chars-minimum-length!',
    jwtExpiresIn: '7d',
  };

  describe('1. Production Mode Security Checks', () => {
    it('should successfully pass when all production secrets and settings are valid', () => {
      expect(() => validateProductionConfig(validProdConfig)).not.toThrow();
    });

    it('should throw an error if JWT_SECRET uses the insecure development default', () => {
      const config = {
        ...validProdConfig,
        jwtSecret: INSECURE_DEV_JWT_SECRET,
      };

      expect(() => validateProductionConfig(config)).toThrow(
        /JWT_SECRET must be securely set to a custom secret/,
      );
    });

    it('should throw an error if JWT_SECRET is shorter than 32 characters', () => {
      const config = {
        ...validProdConfig,
        jwtSecret: 'short-secret-less-than-32-chars',
      };

      expect(() => validateProductionConfig(config)).toThrow(
        /at least 32 characters in production/,
      );
    });

    it('should throw an error if DATABASE_URL is missing in production', () => {
      const config = {
        ...validProdConfig,
        databaseUrl: undefined,
      };

      expect(() => validateProductionConfig(config)).toThrow(
        /DATABASE_URL is required to be set in production/,
      );
    });

    it('should throw an error if CORS_ORIGIN contains wildcard "*" when credentials are true', () => {
      const config = {
        ...validProdConfig,
        corsOrigin: 'https://wierd.food, *',
      };

      expect(() => validateProductionConfig(config)).toThrow(
        /CORS_ORIGIN cannot contain wildcard "\*"/,
      );
    });
  });

  describe('2. Development / Test Mode Checks', () => {
    it('should allow local development defaults when NODE_ENV is development', () => {
      const devConfig: AppConfig = {
        port: 4000,
        nodeEnv: 'development',
        corsOrigin: 'http://localhost:3000,http://localhost:8081',
        jwtSecret: INSECURE_DEV_JWT_SECRET,
        jwtExpiresIn: '7d',
      };

      expect(() => validateProductionConfig(devConfig)).not.toThrow();
    });
  });

  describe('3. Port Validation', () => {
    it('should reject invalid ports', () => {
      expect(() => validateProductionConfig({ ...validProdConfig, port: 0 })).toThrow(
        /Invalid port configured/,
      );

      expect(() => validateProductionConfig({ ...validProdConfig, port: 70000 })).toThrow(
        /Invalid port configured/,
      );

      expect(() => validateProductionConfig({ ...validProdConfig, port: NaN })).toThrow(
        /Invalid port configured/,
      );
    });
  });
});
