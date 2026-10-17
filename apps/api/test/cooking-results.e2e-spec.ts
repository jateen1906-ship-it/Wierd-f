import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, VersioningType } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { AllExceptionsFilter } from '../src/common/filters/http-exception.filter';
import { PrismaService } from '../src/database/prisma.service';

describe('CookingResultsController (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  const testUserA = {
    username: 'e2e_cook_alpha',
    email: 'cook_alpha@wierd.food',
    password: 'Password123!Alpha',
    displayName: 'Cook Alpha',
  };

  const testUserB = {
    username: 'e2e_cook_beta',
    email: 'cook_beta@wierd.food',
    password: 'Password123!Beta',
    displayName: 'Cook Beta',
  };

  let tokenUserA: string;
  let tokenUserB: string;
  let userAId: string;
  let userBId: string;
  let testExperimentId: string;
  let createdResultId: string;

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

    // Clean up any stale test users
    await prisma.user.deleteMany({
      where: {
        OR: [
          { email: testUserA.email },
          { username: testUserA.username },
          { email: testUserB.email },
          { username: testUserB.username },
        ],
      },
    });

    // Register User A
    const regResA = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send(testUserA)
      .expect(201);
    tokenUserA = regResA.body.accessToken;
    userAId = regResA.body.user.id;

    // Register User B
    const regResB = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send(testUserB)
      .expect(201);
    tokenUserB = regResB.body.accessToken;
    userBId = regResB.body.user.id;

    // Create a base experiment for cooking result testing
    const expRes = await request(app.getHttpServer())
      .post('/api/v1/experiments')
      .set('Authorization', `Bearer ${tokenUserA}`)
      .send({
        title: 'Butter Maggi Toast',
        description: 'Testing crunchy buttery noodle toast combination.',
        steps: [
          { stepNumber: 1, instruction: 'Boil maggi' },
          { stepNumber: 2, instruction: 'Toast bread with butter' },
          { stepNumber: 3, instruction: 'Combine together' },
        ],
        difficulty: 'easy',
        estimatedCost: { min: 30, max: 60, currency: 'INR' },
        estimatedTimeMinutes: 10,
        ingredients: [
          {
            name: 'Maggi',
            quantity: 1,
            unit: 'packet',
            isOptional: false,
          },
          {
            name: 'Butter',
            quantity: 20,
            unit: 'grams',
            isOptional: false,
          },
        ],
      })
      .expect(201);

    testExperimentId = expRes.body.id;
  });

  afterAll(async () => {
    if (prisma) {
      await prisma.user.deleteMany({
        where: {
          OR: [
            { email: testUserA.email },
            { username: testUserA.username },
            { email: testUserB.email },
            { username: testUserB.username },
          ],
        },
      });
    }
    await app.close();
  });

  describe('1. POST /api/v1/cooking-results (Creation)', () => {
    it('should create a cooking result with authenticated user and valid payload', async () => {
      const payload = {
        experimentId: testExperimentId,
        media: [
          {
            id: 'proof-img-1',
            url: 'https://cdn.wierd.food/proofs/maggi_toast.jpg',
            type: 'image',
          },
        ],
        caption: 'Turned out surprisingly golden and crispy!',
        notes: 'Low heat toast gives the best texture.',
        outcomeTag: 'unexpectedly_worked',
        tasteRating: 5,
        textureRating: 4,
        wouldMakeAgain: true,
        modificationsMade: 'Added a sprinkle of oregano',
      };

      const response = await request(app.getHttpServer())
        .post('/api/v1/cooking-results')
        .set('Authorization', `Bearer ${tokenUserA}`)
        .send(payload)
        .expect(201);

      createdResultId = response.body.id;

      expect(response.body).toHaveProperty('id');
      expect(response.body.experimentId).toBe(testExperimentId);
      expect(response.body.userId).toBe(userAId);
      expect(response.body.outcomeTag).toBe('unexpectedly_worked');
      expect(response.body.tasteRating).toBe(5);
      expect(response.body.textureRating).toBe(4);
      expect(response.body.wouldMakeAgain).toBe(true);
      expect(response.body.likesCount).toBe(0);
      expect(response.body.user).toBeDefined();
      expect(response.body.user.username).toBe(testUserA.username);

      // Verify no sensitive fields are exposed
      expect(response.body.passwordHash).toBeUndefined();
      expect(response.body.user.passwordHash).toBeUndefined();
      expect(response.body.user.email).toBeUndefined();

      // Verify experiment resultCount was incremented
      const expCheck = await request(app.getHttpServer())
        .get(`/api/v1/experiments/${testExperimentId}`)
        .expect(200);
      expect(expCheck.body.resultCount).toBeGreaterThanOrEqual(1);
    });

    it('should reject unauthenticated creation with 401 Unauthorized', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/cooking-results')
        .send({
          experimentId: testExperimentId,
          media: [{ id: '1', url: 'https://test.com/img.jpg', type: 'image' }],
          outcomeTag: 'perfection',
          tasteRating: 4,
          wouldMakeAgain: true,
        })
        .expect(401);
    });

    it('should reject creation for nonexistent experiment with 404 Not Found', async () => {
      const nonExistentExpId = '99999999-9999-4999-8999-999999999999';
      await request(app.getHttpServer())
        .post('/api/v1/cooking-results')
        .set('Authorization', `Bearer ${tokenUserA}`)
        .send({
          experimentId: nonExistentExpId,
          media: [{ id: '1', url: 'https://test.com/img.jpg', type: 'image' }],
          outcomeTag: 'perfection',
          tasteRating: 4,
          wouldMakeAgain: true,
        })
        .expect(404);
    });

    it('should reject invalid ratings with 400 Bad Request', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/cooking-results')
        .set('Authorization', `Bearer ${tokenUserA}`)
        .send({
          experimentId: testExperimentId,
          media: [{ id: '1', url: 'https://test.com/img.jpg', type: 'image' }],
          outcomeTag: 'perfection',
          tasteRating: 6, // Invalid > 5
          wouldMakeAgain: true,
        })
        .expect(400);

      await request(app.getHttpServer())
        .post('/api/v1/cooking-results')
        .set('Authorization', `Bearer ${tokenUserA}`)
        .send({
          experimentId: testExperimentId,
          media: [{ id: '1', url: 'https://test.com/img.jpg', type: 'image' }],
          outcomeTag: 'perfection',
          tasteRating: 0, // Invalid < 1
          wouldMakeAgain: true,
        })
        .expect(400);
    });

    it('should reject invalid outcome tags with 400 Bad Request', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/cooking-results')
        .set('Authorization', `Bearer ${tokenUserA}`)
        .send({
          experimentId: testExperimentId,
          media: [{ id: '1', url: 'https://test.com/img.jpg', type: 'image' }],
          outcomeTag: 'invalid_unsupported_tag',
          tasteRating: 4,
          wouldMakeAgain: true,
        })
        .expect(400);
    });

    it('should reject empty media array with 400 Bad Request', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/cooking-results')
        .set('Authorization', `Bearer ${tokenUserA}`)
        .send({
          experimentId: testExperimentId,
          media: [],
          outcomeTag: 'perfection',
          tasteRating: 4,
          wouldMakeAgain: true,
        })
        .expect(400);
    });

    it('should ignore client-supplied userId and strictly use authenticated identity', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/cooking-results')
        .set('Authorization', `Bearer ${tokenUserB}`)
        .send({
          experimentId: testExperimentId,
          userId: userAId, // Attempt to spoof User A
          media: [{ id: '1', url: 'https://test.com/img2.jpg', type: 'image' }],
          outcomeTag: 'total_chaos',
          tasteRating: 2,
          wouldMakeAgain: false,
        })
        .expect(201);

      expect(response.body.userId).toBe(userBId); // Strictly uses User B identity
      expect(response.body.userId).not.toBe(userAId);
    });
  });

  describe('2. GET /api/v1/cooking-results/:id (Single Result)', () => {
    it('should retrieve a single cooking result by its valid ID', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/v1/cooking-results/${createdResultId}`)
        .expect(200);

      expect(response.body.id).toBe(createdResultId);
      expect(response.body.experimentId).toBe(testExperimentId);
      expect(response.body.user).toBeDefined();
      expect(response.body.user.username).toBe(testUserA.username);
      expect(response.body.passwordHash).toBeUndefined();
    });

    it('should return 404 Not Found for non-existent result ID', async () => {
      const randomUuid = '88888888-8888-4888-8888-888888888888';
      await request(app.getHttpServer()).get(`/api/v1/cooking-results/${randomUuid}`).expect(404);
    });

    it('should return 400 Bad Request for malformed result ID', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/cooking-results/not-a-valid-uuid')
        .expect(400);
    });
  });

  describe('3. GET /api/v1/experiments/:experimentId/cooking-results (List for Experiment)', () => {
    it('should list paginated cooking results for an experiment', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/v1/experiments/${testExperimentId}/cooking-results?page=1&limit=10`)
        .expect(200);

      expect(response.body).toHaveProperty('items');
      expect(response.body).toHaveProperty('total');
      expect(response.body).toHaveProperty('page', 1);
      expect(response.body).toHaveProperty('limit', 10);
      expect(response.body).toHaveProperty('totalPages');
      expect(response.body).toHaveProperty('hasMore');
      expect(response.body.items.length).toBeGreaterThanOrEqual(1);

      for (const item of response.body.items) {
        expect(item.experimentId).toBe(testExperimentId);
      }
    });

    it('should return 404 Not Found if experiment does not exist', async () => {
      const nonexistentId = '99999999-9999-4999-8999-999999999999';
      await request(app.getHttpServer())
        .get(`/api/v1/experiments/${nonexistentId}/cooking-results`)
        .expect(404);
    });

    it('should return 400 Bad Request for invalid experiment UUID', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/experiments/invalid-id/cooking-results')
        .expect(400);
    });
  });

  describe('4. GET /api/v1/users/me/cooking-results (Authenticated User Results & Isolation)', () => {
    it('should return the authenticated user own cooking results with data isolation', async () => {
      // User A results
      const resA = await request(app.getHttpServer())
        .get('/api/v1/users/me/cooking-results')
        .set('Authorization', `Bearer ${tokenUserA}`)
        .expect(200);

      expect(resA.body).toHaveProperty('items');
      expect(resA.body.items.length).toBeGreaterThanOrEqual(1);
      for (const item of resA.body.items) {
        expect(item.userId).toBe(userAId);
        expect(item.userId).not.toBe(userBId);
      }

      // User B results
      const resB = await request(app.getHttpServer())
        .get('/api/v1/users/me/cooking-results')
        .set('Authorization', `Bearer ${tokenUserB}`)
        .expect(200);

      expect(resB.body).toHaveProperty('items');
      for (const item of resB.body.items) {
        expect(item.userId).toBe(userBId);
        expect(item.userId).not.toBe(userAId);
      }
    });

    it('should reject unauthenticated request with 401 Unauthorized', async () => {
      await request(app.getHttpServer()).get('/api/v1/users/me/cooking-results').expect(401);
    });
  });
});
