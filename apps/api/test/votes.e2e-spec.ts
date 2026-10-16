import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, VersioningType } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { AllExceptionsFilter } from '../src/common/filters/http-exception.filter';
import { PrismaService } from '../src/database/prisma.service';

describe('Votes (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  const testUserA = {
    username: 'e2e_voter_alpha',
    email: 'voter_alpha@wierd.food',
    password: 'Password123!Alpha',
    displayName: 'Voter Alpha',
  };

  const testUserB = {
    username: 'e2e_voter_beta',
    email: 'voter_beta@wierd.food',
    password: 'Password123!Beta',
    displayName: 'Voter Beta',
  };

  let tokenUserA: string;
  let tokenUserB: string;
  let userAId: string;
  let userBId: string;
  let testExperimentId: string;

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

    // Create a base experiment for voting tests
    const expRes = await request(app.getHttpServer())
      .post('/api/v1/experiments')
      .set('Authorization', `Bearer ${tokenUserA}`)
      .send({
        title: 'Chili Chocolate Ramen',
        description: 'Rich dark chocolate broth with spicy chili oil and ramen noodles.',
        steps: ['Prepare ramen broth', 'Melt dark chocolate', 'Combine with chili oil'],
        difficulty: 'medium',
        estimatedTimeMinutes: 20,
        ingredients: [
          {
            name: 'Ramen noodles',
            quantity: 1,
            unit: 'pack',
            isOptional: false,
          },
          {
            name: 'Dark Chocolate',
            quantity: 30,
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
      await prisma.$disconnect();
    }
    if (app) {
      await app.close();
    }
  });

  describe('1. POST /api/v1/experiments/:experimentId/votes', () => {
    it('should reject unauthenticated vote submission with 401', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/v1/experiments/${testExperimentId}/votes`)
        .send({ choice: 'would_try' })
        .expect(401);

      expect(res.body.statusCode).toBe(401);
    });

    it('should reject invalid vote choice with 400', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/v1/experiments/${testExperimentId}/votes`)
        .set('Authorization', `Bearer ${tokenUserA}`)
        .send({ choice: 'definitely_not' })
        .expect(400);

      expect(res.body.statusCode).toBe(400);
    });

    it('should reject non-uuid experimentId with 400', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/experiments/invalid-uuid/votes')
        .set('Authorization', `Bearer ${tokenUserA}`)
        .send({ choice: 'would_try' })
        .expect(400);

      expect(res.body.statusCode).toBe(400);
    });

    it('should reject voting on non-existent experiment with 404', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/experiments/00000000-0000-4000-8000-000000000000/votes')
        .set('Authorization', `Bearer ${tokenUserA}`)
        .send({ choice: 'would_try' })
        .expect(404);

      expect(res.body.statusCode).toBe(404);
    });

    it('should cast a new vote with status 201 and increment experiment voteCount', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/v1/experiments/${testExperimentId}/votes`)
        .set('Authorization', `Bearer ${tokenUserA}`)
        .send({ choice: 'would_try' })
        .expect(201);

      expect(res.body.id).toBeDefined();
      expect(res.body.experimentId).toBe(testExperimentId);
      expect(res.body.userId).toBe(userAId);
      expect(res.body.choice).toBe('would_try');

      // Verify experiment counter was incremented
      const expRes = await request(app.getHttpServer())
        .get(`/api/v1/experiments/${testExperimentId}`)
        .expect(200);

      expect(expRes.body.voteCount).toBe(1);
    });

    it('should update existing vote with status 200 and NOT increment voteCount', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/v1/experiments/${testExperimentId}/votes`)
        .set('Authorization', `Bearer ${tokenUserA}`)
        .send({ choice: 'pass' })
        .expect(200);

      expect(res.body.choice).toBe('pass');

      // Verify experiment counter remained 1 (no double increment)
      const expRes = await request(app.getHttpServer())
        .get(`/api/v1/experiments/${testExperimentId}`)
        .expect(200);

      expect(expRes.body.voteCount).toBe(1);
    });
  });

  describe('2. GET /api/v1/experiments/:experimentId/votes (Summary)', () => {
    it('should return 404 for non-existent experiment', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/experiments/00000000-0000-4000-8000-000000000000/votes')
        .expect(404);
    });

    it('should allow public access and return aggregate counts without userVote', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/experiments/${testExperimentId}/votes`)
        .expect(200);

      expect(res.body.experimentId).toBe(testExperimentId);
      expect(res.body.passCount).toBe(1);
      expect(res.body.wouldTryCount).toBe(0);
      expect(res.body.totalVotes).toBe(1);
      expect(res.body.userVote).toBeUndefined();
    });

    it('should return userVote when requested by authenticated caller', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/experiments/${testExperimentId}/votes`)
        .set('Authorization', `Bearer ${tokenUserA}`)
        .expect(200);

      expect(res.body.totalVotes).toBe(1);
      expect(res.body.userVote).toBe('pass');
    });

    it('should include second user vote and reflect updated aggregate counts', async () => {
      // User B votes 'would_try'
      await request(app.getHttpServer())
        .post(`/api/v1/experiments/${testExperimentId}/votes`)
        .set('Authorization', `Bearer ${tokenUserB}`)
        .send({ choice: 'would_try' })
        .expect(201);

      const res = await request(app.getHttpServer())
        .get(`/api/v1/experiments/${testExperimentId}/votes`)
        .set('Authorization', `Bearer ${tokenUserB}`)
        .expect(200);

      expect(res.body.passCount).toBe(1);
      expect(res.body.wouldTryCount).toBe(1);
      expect(res.body.totalVotes).toBe(2);
      expect(res.body.userVote).toBe('would_try');
    });
  });

  describe('3. GET /api/v1/users/me/votes (User History & Isolation)', () => {
    it('should reject unauthenticated access with 401', async () => {
      await request(app.getHttpServer()).get('/api/v1/users/me/votes').expect(401);
    });

    it('should return only the authenticated user voting history', async () => {
      const resA = await request(app.getHttpServer())
        .get('/api/v1/users/me/votes')
        .set('Authorization', `Bearer ${tokenUserA}`)
        .expect(200);

      expect(resA.body.items).toHaveLength(1);
      expect(resA.body.items[0].experimentId).toBe(testExperimentId);
      expect(resA.body.items[0].choice).toBe('pass');
      expect(resA.body.items[0].experiment.title).toBe('Chili Chocolate Ramen');

      const resB = await request(app.getHttpServer())
        .get('/api/v1/users/me/votes')
        .set('Authorization', `Bearer ${tokenUserB}`)
        .expect(200);

      expect(resB.body.items).toHaveLength(1);
      expect(resB.body.items[0].choice).toBe('would_try');
      expect(resB.body.items[0].userId).toBe(userBId);
    });

    it('should support pagination query parameters', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/users/me/votes?page=1&limit=10')
        .set('Authorization', `Bearer ${tokenUserA}`)
        .expect(200);

      expect(res.body.page).toBe(1);
      expect(res.body.limit).toBe(10);
      expect(res.body.totalPages).toBe(1);
      expect(res.body.hasMore).toBe(false);
    });
  });

  describe('4. DELETE /api/v1/experiments/:experimentId/votes', () => {
    it('should reject unauthenticated delete with 401', async () => {
      await request(app.getHttpServer())
        .delete(`/api/v1/experiments/${testExperimentId}/votes`)
        .expect(401);
    });

    it('should delete caller vote, decrement voteCount, and update summary', async () => {
      // User A deletes their vote
      const res = await request(app.getHttpServer())
        .delete(`/api/v1/experiments/${testExperimentId}/votes`)
        .set('Authorization', `Bearer ${tokenUserA}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.message).toBe('Vote deleted successfully');

      // Verify experiment counter decremented to 1 (only User B vote remains)
      const expRes = await request(app.getHttpServer())
        .get(`/api/v1/experiments/${testExperimentId}`)
        .expect(200);

      expect(expRes.body.voteCount).toBe(1);

      // Verify summary reflects vote removal for User A
      const summaryRes = await request(app.getHttpServer())
        .get(`/api/v1/experiments/${testExperimentId}/votes`)
        .set('Authorization', `Bearer ${tokenUserA}`)
        .expect(200);

      expect(summaryRes.body.totalVotes).toBe(1);
      expect(summaryRes.body.passCount).toBe(0);
      expect(summaryRes.body.wouldTryCount).toBe(1);
      expect(summaryRes.body.userVote).toBeUndefined();
    });

    it('should return 404 when trying to delete already deleted vote', async () => {
      await request(app.getHttpServer())
        .delete(`/api/v1/experiments/${testExperimentId}/votes`)
        .set('Authorization', `Bearer ${tokenUserA}`)
        .expect(404);
    });
  });
});
