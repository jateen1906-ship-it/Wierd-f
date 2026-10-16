import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, VersioningType } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { AllExceptionsFilter } from '../src/common/filters/http-exception.filter';
import { PrismaService } from '../src/database/prisma.service';

describe('AuthController (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  const testUser = {
    username: 'e2e_chef_test',
    email: 'e2e_chef_test@example.com',
    password: 'SuperSecurePassword123!',
    displayName: 'E2E Chef',
  };

  let registeredAccessToken: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalFilters(new AllExceptionsFilter());
    app.setGlobalPrefix('api', {
      exclude: ['health'],
    });
    app.enableVersioning({
      type: VersioningType.URI,
      defaultVersion: '1',
    });
    await app.init();

    prisma = app.get(PrismaService);

    // Clean up any stale test user
    await prisma.user.deleteMany({
      where: {
        OR: [{ email: testUser.email }, { username: testUser.username }],
      },
    });
  });

  afterAll(async () => {
    // Cleanup created test user
    if (prisma) {
      await prisma.user.deleteMany({
        where: {
          OR: [{ email: testUser.email }, { username: testUser.username }],
        },
      });
    }
    await app.close();
  });

  describe('POST /api/v1/auth/register', () => {
    it('should successfully register a user and return 201 with accessToken and safe user info', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send(testUser)
        .expect(201);

      expect(response.body).toHaveProperty('accessToken');
      expect(typeof response.body.accessToken).toBe('string');
      expect(response.body).toHaveProperty('user');
      expect(response.body.user).toHaveProperty('id');
      expect(response.body.user.username).toBe(testUser.username);
      expect(response.body.user.email).toBe(testUser.email);
      expect(response.body.user.displayName).toBe(testUser.displayName);
      expect(response.body.user).not.toHaveProperty('password');
      expect(response.body.user).not.toHaveProperty('passwordHash');

      registeredAccessToken = response.body.accessToken;
    });

    it('should reject duplicate email registration with 409 Conflict', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({
          ...testUser,
          username: 'unique_user_2',
        })
        .expect(409);

      expect(response.body).toHaveProperty('statusCode', 409);
      expect(response.body.message).toContain('email address already exists');
      expect(response.body).not.toHaveProperty('stack');
    });

    it('should reject duplicate username registration with 409 Conflict', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({
          ...testUser,
          email: 'unique_email_2@example.com',
        })
        .expect(409);

      expect(response.body).toHaveProperty('statusCode', 409);
      expect(response.body.message).toContain('username already exists');
      expect(response.body).not.toHaveProperty('stack');
    });

    it('should reject registration with invalid password (< 8 chars) with 400 Bad Request', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({
          username: 'valid_user_3',
          email: 'valid3@example.com',
          password: 'short',
        })
        .expect(400);

      expect(response.body).toHaveProperty('statusCode', 400);
      expect(response.body.message).toBe('Validation failed');
      expect(response.body).toHaveProperty('details');
    });
  });

  describe('POST /api/v1/auth/login', () => {
    it('should login successfully with valid credentials and return 200 with accessToken', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          email: testUser.email,
          password: testUser.password,
        })
        .expect(200);

      expect(response.body).toHaveProperty('accessToken');
      expect(typeof response.body.accessToken).toBe('string');
      expect(response.body.user.email).toBe(testUser.email);
      expect(response.body.user).not.toHaveProperty('passwordHash');
    });

    it('should return 401 Unauthorized for incorrect password', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          email: testUser.email,
          password: 'WrongPassword!',
        })
        .expect(401);

      expect(response.body).toHaveProperty('statusCode', 401);
      expect(response.body.message).toBe('Invalid email or password');
      expect(response.body).not.toHaveProperty('stack');
    });

    it('should return 401 Unauthorized for non-existent email with generic message', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          email: 'nobody_exists@example.com',
          password: 'AnyPassword123!',
        })
        .expect(401);

      expect(response.body).toHaveProperty('statusCode', 401);
      expect(response.body.message).toBe('Invalid email or password');
    });
  });

  describe('GET /api/v1/auth/me', () => {
    it('should return 401 Unauthorized when Bearer token is missing', async () => {
      const response = await request(app.getHttpServer()).get('/api/v1/auth/me').expect(401);

      expect(response.body).toHaveProperty('statusCode', 401);
    });

    it('should return 401 Unauthorized when Bearer token is invalid', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/auth/me')
        .set('Authorization', 'Bearer invalid.jwt.token')
        .expect(401);

      expect(response.body).toHaveProperty('statusCode', 401);
    });

    it('should return 200 with current user profile when valid Bearer token is supplied', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${registeredAccessToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('id');
      expect(response.body.username).toBe(testUser.username);
      expect(response.body.email).toBe(testUser.email);
      expect(response.body).toHaveProperty('preferences');
      expect(response.body).not.toHaveProperty('passwordHash');
      expect(response.body).not.toHaveProperty('password');
    });
  });
});
