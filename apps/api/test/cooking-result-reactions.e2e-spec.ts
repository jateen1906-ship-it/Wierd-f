import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, VersioningType } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { AllExceptionsFilter } from '../src/common/filters/http-exception.filter';
import { PrismaService } from '../src/database/prisma.service';

describe('Cooking Result Reactions (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  const testUserA = {
    username: 'e2e_reactor_alpha',
    email: 'reactor_alpha@wierd.food',
    password: 'Password123!Alpha',
    displayName: 'Reactor Alpha',
  };

  const testUserB = {
    username: 'e2e_reactor_beta',
    email: 'reactor_beta@wierd.food',
    password: 'Password123!Beta',
    displayName: 'Reactor Beta',
  };

  let tokenUserA: string;
  let tokenUserB: string;
  let userAId: string;
  let userBId: string;
  let testExperimentId: string;
  let testResultId: string;

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

    // Create an experiment
    const expRes = await request(app.getHttpServer())
      .post('/api/v1/experiments')
      .set('Authorization', `Bearer ${tokenUserA}`)
      .send({
        title: 'Ghost Pepper Sourdough',
        description: 'Extremely spicy fermented bread test.',
        steps: ['Mix sourdough starter with ghost pepper mash', 'Bake at 450F'],
        difficulty: 'hard',
        estimatedTimeMinutes: 120,
        ingredients: [
          {
            name: 'Flour',
            quantity: 500,
            unit: 'grams',
            isOptional: false,
          },
          {
            name: 'Ghost Pepper Mash',
            quantity: 15,
            unit: 'grams',
            isOptional: false,
          },
        ],
      })
      .expect(201);
    testExperimentId = expRes.body.id;

    // Create a cooking result
    const resultRes = await request(app.getHttpServer())
      .post('/api/v1/cooking-results')
      .set('Authorization', `Bearer ${tokenUserA}`)
      .send({
        experimentId: testExperimentId,
        media: [
          {
            id: 'proof-1',
            url: 'https://cdn.wierd.food/results/spicy-bread.jpg',
            type: 'image',
          },
        ],
        caption: 'The bread actually held structure and tasted incendiary.',
        outcomeTag: 'flavor_bomb',
        tasteRating: 5,
        wouldMakeAgain: true,
      })
      .expect(201);
    testResultId = resultRes.body.id;
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
      await prisma.$disconnect();
    }
    if (app) {
      await app.close();
    }
  });

  describe('1. POST /api/v1/cooking-results/:resultId/reactions', () => {
    it('should reject unauthenticated request with 401', async () => {
      await request(app.getHttpServer())
        .post(`/api/v1/cooking-results/${testResultId}/reactions`)
        .send({ type: 'fire' })
        .expect(401);
    });

    it('should reject invalid reaction type with 400', async () => {
      await request(app.getHttpServer())
        .post(`/api/v1/cooking-results/${testResultId}/reactions`)
        .set('Authorization', `Bearer ${tokenUserA}`)
        .send({ type: 'thumbs_up' })
        .expect(400);
    });

    it('should reject non-uuid resultId with 400', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/cooking-results/not-a-valid-uuid/reactions')
        .set('Authorization', `Bearer ${tokenUserA}`)
        .send({ type: 'fire' })
        .expect(400);
    });

    it('should return 404 when cooking result does not exist', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/cooking-results/00000000-0000-4000-8000-000000000000/reactions')
        .set('Authorization', `Bearer ${tokenUserA}`)
        .send({ type: 'fire' })
        .expect(404);
    });

    it('should cast a new reaction with 201 and increment likesCount', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/v1/cooking-results/${testResultId}/reactions`)
        .set('Authorization', `Bearer ${tokenUserA}`)
        .send({ type: 'fire' })
        .expect(201);

      expect(res.body.id).toBeDefined();
      expect(res.body.userId).toBe(userAId);
      expect(res.body.resultId).toBe(testResultId);
      expect(res.body.type).toBe('fire');

      // Verify cooking result likesCount was incremented
      const resultCheck = await request(app.getHttpServer())
        .get(`/api/v1/cooking-results/${testResultId}`)
        .expect(200);

      expect(resultCheck.body.likesCount).toBe(1);
    });

    it('should update reaction to new type with 200 without double-counting likesCount', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/v1/cooking-results/${testResultId}/reactions`)
        .set('Authorization', `Bearer ${tokenUserA}`)
        .send({ choice: 'respect' })
        .expect(200);

      expect(res.body.type).toBe('respect');

      // Verify likesCount remains 1
      const resultCheck = await request(app.getHttpServer())
        .get(`/api/v1/cooking-results/${testResultId}`)
        .expect(200);

      expect(resultCheck.body.likesCount).toBe(1);
    });
  });

  describe('2. GET /api/v1/cooking-results/:resultId/reactions (Summary)', () => {
    it('should return 404 for non-existent cooking result', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/cooking-results/00000000-0000-4000-8000-000000000000/reactions')
        .expect(404);
    });

    it('should be publicly readable and return all 5 counts without userReaction', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/cooking-results/${testResultId}/reactions`)
        .expect(200);

      expect(res.body.resultId).toBe(testResultId);
      expect(res.body.respectCount).toBe(1);
      expect(res.body.fireCount).toBe(0);
      expect(res.body.yuckCount).toBe(0);
      expect(res.body.laughCount).toBe(0);
      expect(res.body.mindBlownCount).toBe(0);
      expect(res.body.totalReactions).toBe(1);
      expect(res.body.likesCount).toBe(1);
      expect(res.body.userReaction).toBeUndefined();
    });

    it('should include userReaction when requested with valid token', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/cooking-results/${testResultId}/reactions`)
        .set('Authorization', `Bearer ${tokenUserA}`)
        .expect(200);

      expect(res.body.userReaction).toBe('respect');
    });

    it('should reflect multiple user reactions accurately', async () => {
      // User B reacts with 'fire'
      await request(app.getHttpServer())
        .post(`/api/v1/cooking-results/${testResultId}/reactions`)
        .set('Authorization', `Bearer ${tokenUserB}`)
        .send({ type: 'fire' })
        .expect(201);

      const res = await request(app.getHttpServer())
        .get(`/api/v1/cooking-results/${testResultId}/reactions`)
        .set('Authorization', `Bearer ${tokenUserB}`)
        .expect(200);

      expect(res.body.respectCount).toBe(1);
      expect(res.body.fireCount).toBe(1);
      expect(res.body.totalReactions).toBe(2);
      expect(res.body.likesCount).toBe(2);
      expect(res.body.userReaction).toBe('fire');
    });
  });

  describe('3. GET /api/v1/users/me/reactions (User History)', () => {
    it('should reject unauthenticated request with 401', async () => {
      await request(app.getHttpServer()).get('/api/v1/users/me/reactions').expect(401);
    });

    it('should return caller reactions with attached cooking result metadata', async () => {
      const resA = await request(app.getHttpServer())
        .get('/api/v1/users/me/reactions')
        .set('Authorization', `Bearer ${tokenUserA}`)
        .expect(200);

      expect(resA.body.items).toHaveLength(1);
      expect(resA.body.items[0].type).toBe('respect');
      expect(resA.body.items[0].result.id).toBe(testResultId);
      expect(resA.body.items[0].result.outcomeTag).toBe('flavor_bomb');

      const resB = await request(app.getHttpServer())
        .get('/api/v1/users/me/reactions')
        .set('Authorization', `Bearer ${tokenUserB}`)
        .expect(200);

      expect(resB.body.items).toHaveLength(1);
      expect(resB.body.items[0].type).toBe('fire');
      expect(resB.body.items[0].userId).toBe(userBId);
    });
  });

  describe('4. DELETE /api/v1/cooking-results/:resultId/reactions', () => {
    it('should reject unauthenticated delete with 401', async () => {
      await request(app.getHttpServer())
        .delete(`/api/v1/cooking-results/${testResultId}/reactions`)
        .expect(401);
    });

    it('should delete caller reaction, decrement likesCount, and update summary', async () => {
      const res = await request(app.getHttpServer())
        .delete(`/api/v1/cooking-results/${testResultId}/reactions`)
        .set('Authorization', `Bearer ${tokenUserA}`)
        .expect(200);

      expect(res.body.success).toBe(true);

      // Verify cooking result likesCount decremented to 1 (only User B reaction remains)
      const resultCheck = await request(app.getHttpServer())
        .get(`/api/v1/cooking-results/${testResultId}`)
        .expect(200);

      expect(resultCheck.body.likesCount).toBe(1);

      // Verify summary reflects reaction removal
      const summaryRes = await request(app.getHttpServer())
        .get(`/api/v1/cooking-results/${testResultId}/reactions`)
        .set('Authorization', `Bearer ${tokenUserA}`)
        .expect(200);

      expect(summaryRes.body.totalReactions).toBe(1);
      expect(summaryRes.body.respectCount).toBe(0);
      expect(summaryRes.body.fireCount).toBe(1);
      expect(summaryRes.body.userReaction).toBeUndefined();
    });

    it('should return 404 when trying to delete already deleted reaction', async () => {
      await request(app.getHttpServer())
        .delete(`/api/v1/cooking-results/${testResultId}/reactions`)
        .set('Authorization', `Bearer ${tokenUserA}`)
        .expect(404);
    });
  });
});
