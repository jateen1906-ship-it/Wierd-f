import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, VersioningType } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { AllExceptionsFilter } from '../src/common/filters/http-exception.filter';
import { PrismaService } from '../src/database/prisma.service';

describe('Experiments Discovery Feed (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  const testUserA = {
    username: 'e2e_feed_alpha',
    email: 'feed_alpha@wierd.food',
    password: 'Password123!Alpha',
    displayName: 'Feed Alpha',
  };

  const testUserB = {
    username: 'e2e_feed_beta',
    email: 'feed_beta@wierd.food',
    password: 'Password123!Beta',
    displayName: 'Feed Beta',
  };

  let tokenUserA: string;
  let tokenUserB: string;
  let rootExpAId: string;
  let remixExpBId: string;

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

    // Clean up test users
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

    // Register User B
    const regResB = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send(testUserB)
      .expect(201);
    tokenUserB = regResB.body.accessToken;

    // Create root experiment by User A
    const expResA = await request(app.getHttpServer())
      .post('/api/v1/experiments')
      .set('Authorization', `Bearer ${tokenUserA}`)
      .send({
        title: 'Balsamic Strawberry Omelette',
        description: 'Sweet and tangy breakfast experiment.',
        steps: [
          { stepNumber: 1, instruction: 'Slice strawberries' },
          { stepNumber: 2, instruction: 'Whisk eggs' },
          { stepNumber: 3, instruction: 'Cook and drizzle balsamic' },
        ],
        difficulty: 'easy',
        estimatedCost: { min: 40, max: 80, currency: 'INR' },
        estimatedTimeMinutes: 10,
        ingredients: [
          {
            name: 'Eggs',
            quantity: 3,
            unit: 'pcs',
            isOptional: false,
          },
          {
            name: 'Strawberries',
            quantity: 50,
            unit: 'grams',
            isOptional: false,
          },
        ],
      })
      .expect(201);
    rootExpAId = expResA.body.id;

    // Create remix experiment by User B branching off User A
    const remixResB = await request(app.getHttpServer())
      .post(`/api/v1/experiments/${rootExpAId}/remix`)
      .set('Authorization', `Bearer ${tokenUserB}`)
      .send({
        title: 'Spicy Balsamic Strawberry Omelette',
        description: 'Added crushed habanero flakes for sweet-acid-heat harmony.',
        steps: [
          { stepNumber: 1, instruction: 'Slice strawberries' },
          { stepNumber: 2, instruction: 'Whisk eggs with habanero' },
          { stepNumber: 3, instruction: 'Cook omelette' },
        ],
        difficulty: 'hard',
        estimatedTimeMinutes: 12,
        ingredients: [
          {
            name: 'Eggs',
            quantity: 3,
            unit: 'pcs',
            isOptional: false,
          },
          {
            name: 'Habanero Flakes',
            quantity: 5,
            unit: 'grams',
            isOptional: false,
            isCustomAddition: true,
          },
        ],
        transformations: [
          {
            type: 'ingredient_added',
            description: 'Added habanero flakes into egg mixture.',
          },
        ],
      })
      .expect(201);
    remixExpBId = remixResB.body.id;
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

  describe('1. GET /api/v1/experiments (Public Discovery Feed)', () => {
    it('should return a paginated feed with default trending sort and safety filter', async () => {
      const res = await request(app.getHttpServer()).get('/api/v1/experiments').expect(200);

      expect(res.body.items).toBeDefined();
      expect(Array.isArray(res.body.items)).toBe(true);
      expect(res.body.page).toBe(1);
      expect(res.body.limit).toBe(20);
      expect(typeof res.body.total).toBe('number');
      expect(typeof res.body.totalPages).toBe('number');
      expect(typeof res.body.hasMore).toBe('boolean');

      // Verify creator profiles are sanitized
      if (res.body.items.length > 0) {
        const first = res.body.items[0];
        expect(first.creator.passwordHash).toBeUndefined();
        expect(first.creator.email).toBeUndefined();
      }
    });

    it('should filter by search keyword across title and description', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/experiments?search=Strawberry')
        .expect(200);

      expect(res.body.items.length).toBeGreaterThanOrEqual(1);
      for (const item of res.body.items) {
        const matches =
          item.title.toLowerCase().includes('strawberry') ||
          item.description.toLowerCase().includes('strawberry');
        expect(matches).toBe(true);
      }
    });

    it('should filter by difficulty level', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/experiments?difficulty=easy')
        .expect(200);

      for (const item of res.body.items) {
        expect(item.difficulty).toBe('easy');
      }
    });

    it('should filter by rootOnly=true (only root recipes, parentId is null)', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/experiments?rootOnly=true')
        .expect(200);

      for (const item of res.body.items) {
        expect(item.parentId).toBeNull();
        expect(item.branchDepth).toBe(0);
      }
    });

    it('should filter by rootOnly=false (only remix branches, parentId is not null)', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/experiments?rootOnly=false')
        .expect(200);

      for (const item of res.body.items) {
        expect(item.parentId).not.toBeNull();
        expect(item.branchDepth).toBeGreaterThan(0);
      }
    });

    it('should sort by sort=recent', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/experiments?sort=recent')
        .expect(200);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.items)).toBe(true);
    });

    it('should reject invalid sort or limit with 400', async () => {
      await request(app.getHttpServer()).get('/api/v1/experiments?sort=invalid_mode').expect(400);

      await request(app.getHttpServer()).get('/api/v1/experiments?limit=150').expect(400);
    });
  });

  describe('2. GET /api/v1/users/me/experiments (Authenticated Creator Feed)', () => {
    it('should reject unauthenticated request with 401', async () => {
      await request(app.getHttpServer()).get('/api/v1/users/me/experiments').expect(401);
    });

    it('should return only User A experiments when called by User A', async () => {
      const resA = await request(app.getHttpServer())
        .get('/api/v1/users/me/experiments')
        .set('Authorization', `Bearer ${tokenUserA}`)
        .expect(200);

      expect(resA.body.items.length).toBeGreaterThanOrEqual(1);
      const foundRoot = resA.body.items.find((item: any) => item.id === rootExpAId);
      expect(foundRoot).toBeDefined();

      // Ensure User B remix is NOT in User A list
      const foundRemix = resA.body.items.find((item: any) => item.id === remixExpBId);
      expect(foundRemix).toBeUndefined();
    });

    it('should return only User B experiments when called by User B', async () => {
      const resB = await request(app.getHttpServer())
        .get('/api/v1/users/me/experiments')
        .set('Authorization', `Bearer ${tokenUserB}`)
        .expect(200);

      expect(resB.body.items.length).toBeGreaterThanOrEqual(1);
      const foundRemix = resB.body.items.find((item: any) => item.id === remixExpBId);
      expect(foundRemix).toBeDefined();
    });
  });
});
