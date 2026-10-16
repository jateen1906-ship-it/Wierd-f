import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, VersioningType } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { AllExceptionsFilter } from '../src/common/filters/http-exception.filter';
import { PrismaService } from '../src/database/prisma.service';

describe('ExperimentsController (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  const chefUser1 = {
    username: 'e2e_chef_alpha',
    email: 'chef_alpha@wierd.food',
    password: 'Password123!Alpha',
    displayName: 'Chef Alpha',
  };

  const chefUser2 = {
    username: 'e2e_chef_beta',
    email: 'chef_beta@wierd.food',
    password: 'Password123!Beta',
    displayName: 'Chef Beta',
  };

  let tokenUser1: string;
  let tokenUser2: string;
  let user1Id: string;
  let user2Id: string;

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
          { email: chefUser1.email },
          { username: chefUser1.username },
          { email: chefUser2.email },
          { username: chefUser2.username },
        ],
      },
    });

    // Register User 1
    const regRes1 = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send(chefUser1)
      .expect(201);
    tokenUser1 = regRes1.body.accessToken;
    user1Id = regRes1.body.user.id;

    // Register User 2
    const regRes2 = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send(chefUser2)
      .expect(201);
    tokenUser2 = regRes2.body.accessToken;
    user2Id = regRes2.body.user.id;
  });

  afterAll(async () => {
    if (prisma) {
      await prisma.user.deleteMany({
        where: {
          OR: [
            { email: chefUser1.email },
            { username: chefUser1.username },
            { email: chefUser2.email },
            { username: chefUser2.username },
          ],
        },
      });
    }
    await app.close();
  });

  // Track experiments for multi-level tests
  let experimentAId: string;
  let experimentBId: string;
  let experimentCId: string;

  describe('ROOT EXPERIMENT CREATION', () => {
    const rootPayload = {
      title: 'Miso Espresso Ramen',
      description: 'An umami-packed dark roast coffee and red miso broth experiment.',
      ingredients: [
        {
          name: 'Ramen Noodles',
          quantity: 150,
          unit: 'g',
          preparation: 'freshly pulled',
          isOptional: false,
          isCustomAddition: false,
        },
        {
          name: 'Red Miso Paste',
          quantity: 40,
          unit: 'g',
          preparation: 'dissolved in dashi',
          isOptional: false,
          isCustomAddition: false,
        },
        {
          name: 'Double Espresso Shot',
          quantity: 60,
          unit: 'ml',
          preparation: 'freshly pulled dark roast',
          isOptional: false,
          isCustomAddition: true,
        },
      ],
      steps: [
        { stepNumber: 1, instruction: 'Pull a double espresso shot and steep with kombu dashi.' },
        { stepNumber: 2, instruction: 'Whisk in red miso paste until emulsified.' },
        { stepNumber: 3, instruction: 'Boil ramen noodles for 90 seconds and combine.' },
      ],
      difficulty: 'hard',
      estimatedCost: { min: 200, max: 350, currency: 'INR' },
      estimatedTimeMinutes: 25,
    };

    it('1. Authenticated user can create a root experiment', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/experiments')
        .set('Authorization', `Bearer ${tokenUser1}`)
        .send(rootPayload)
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.title).toBe(rootPayload.title);
      expect(response.body.description).toBe(rootPayload.description);
      expect(response.body.difficulty).toBe('hard');
      expect(response.body.estimatedTimeMinutes).toBe(25);
      expect(response.body.ingredients).toHaveLength(3);
      expect(response.body.steps).toHaveLength(3);
      expect(response.body.creator).toHaveProperty('username', chefUser1.username);

      experimentAId = response.body.id;
    });

    it('2. Root experiment gets parentId = null, rootId = own ID, branchDepth = 0', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/v1/experiments/${experimentAId}`)
        .expect(200);

      expect(response.body.id).toBe(experimentAId);
      expect(response.body.parentId).toBeNull();
      expect(response.body.rootId).toBe(experimentAId);
      expect(response.body.branchDepth).toBe(0);
      expect(response.body.creatorId).toBe(user1Id);
      expect(response.body.remixCount).toBe(0);
    });
  });

  describe('REMIX / BRANCH EXPERIMENT', () => {
    const remixBPayload = {
      title: 'Smoked Vanilla Miso Espresso Ramen',
      description: 'Remix A -> B: Infusing Madagascar vanilla and smoked sea salt into the broth.',
      transformations: [
        {
          type: 'ingredient_added',
          description: 'Added Madagascar vanilla bean pod infusion',
          newValue: 'Vanilla Bean',
        },
        {
          type: 'spice_level_changed',
          description: 'Added smoked chili crisp for contrast',
          newValue: 'Medium Hot',
        },
      ],
      ingredients: [
        { name: 'Ramen Noodles', quantity: 150, unit: 'g' },
        { name: 'Red Miso Paste', quantity: 40, unit: 'g' },
        { name: 'Double Espresso Shot', quantity: 60, unit: 'ml' },
        { name: 'Vanilla Bean Pod', quantity: 0.5, unit: 'piece', isCustomAddition: true },
        { name: 'Smoked Chili Crisp', quantity: 15, unit: 'g', isCustomAddition: true },
      ],
      steps: [
        { stepNumber: 1, instruction: 'Simmer vanilla pod in espresso-dashi broth.' },
        { stepNumber: 2, instruction: 'Whisk in red miso and finish with chili crisp.' },
      ],
      difficulty: 'chaos',
      estimatedCost: { min: 250, max: 400, currency: 'INR' },
      estimatedTimeMinutes: 30,
    };

    it('3. Authenticated user can remix an experiment', async () => {
      const response = await request(app.getHttpServer())
        .post(`/api/v1/experiments/${experimentAId}/remix`)
        .set('Authorization', `Bearer ${tokenUser2}`)
        .send(remixBPayload)
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.title).toBe(remixBPayload.title);
      expect(response.body.transformations).toHaveLength(2);
      expect(response.body.creatorId).toBe(user2Id);

      experimentBId = response.body.id;
    });

    it('4. Remix creates a NEW ID', () => {
      expect(experimentBId).toBeDefined();
      expect(experimentBId).not.toBe(experimentAId);
    });

    it('5. Remix parentId points to the original experiment', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/v1/experiments/${experimentBId}`)
        .expect(200);

      expect(response.body.parentId).toBe(experimentAId);
    });

    it('6. Remix rootId remains the original root', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/v1/experiments/${experimentBId}`)
        .expect(200);

      expect(response.body.rootId).toBe(experimentAId);
    });

    it('7. Remix branchDepth increments correctly to 1', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/v1/experiments/${experimentBId}`)
        .expect(200);

      expect(response.body.branchDepth).toBe(1);
    });

    it('8. Original experiment remains unchanged with lineage intact and remixCount incremented', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/v1/experiments/${experimentAId}`)
        .expect(200);

      expect(response.body.id).toBe(experimentAId);
      expect(response.body.parentId).toBeNull();
      expect(response.body.rootId).toBe(experimentAId);
      expect(response.body.branchDepth).toBe(0);
      expect(response.body.title).toBe('Miso Espresso Ramen');
      expect(response.body.remixCount).toBe(1);
    });
  });

  describe('MULTI-LEVEL LINEAGE', () => {
    it('9. A created B (verified in previous step)', () => {
      expect(experimentBId).toBeDefined();
    });

    it('10. B can create C', async () => {
      const remixCPayload = {
        title: 'Chilled Cold-Brew Miso Carbonara Ramen (Remix C)',
        description:
          'Remix B -> C: Serving chilled with a nitro cold brew reduction and cured yolk.',
        transformations: [
          {
            type: 'cooking_method_changed',
            description: 'Changed from hot broth to nitro cold brew reduction',
            previousValue: 'Hot simmer',
            newValue: 'Chilled nitro reduction',
          },
        ],
        ingredients: [
          { name: 'Ramen Noodles', quantity: 150, unit: 'g' },
          { name: 'Nitro Cold Brew', quantity: 100, unit: 'ml', isCustomAddition: true },
          { name: 'Cured Egg Yolk', quantity: 1, unit: 'piece', isCustomAddition: true },
        ],
        steps: [
          { stepNumber: 1, instruction: 'Reduce nitro cold brew with sweet miso.' },
          { stepNumber: 2, instruction: 'Shock noodles in ice water, plate with cured yolk.' },
        ],
      };

      const response = await request(app.getHttpServer())
        .post(`/api/v1/experiments/${experimentBId}/remix`)
        .set('Authorization', `Bearer ${tokenUser1}`)
        .send(remixCPayload)
        .expect(201);

      experimentCId = response.body.id;
      expect(experimentCId).toBeDefined();
      expect(experimentCId).not.toBe(experimentBId);
      expect(experimentCId).not.toBe(experimentAId);
    });

    it('11. C has parentId = B, rootId = A, branchDepth = 2', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/v1/experiments/${experimentCId}`)
        .expect(200);

      expect(response.body.id).toBe(experimentCId);
      expect(response.body.parentId).toBe(experimentBId);
      expect(response.body.rootId).toBe(experimentAId);
      expect(response.body.branchDepth).toBe(2);
    });
  });

  describe('LINEAGE ENDPOINT', () => {
    it('12. GET /experiments/:id/lineage returns the correct ancestors (C -> B -> A)', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/v1/experiments/${experimentCId}/lineage`)
        .expect(200);

      expect(response.body).toHaveProperty('experimentId', experimentCId);
      expect(response.body).toHaveProperty('ancestors');
      expect(response.body).toHaveProperty('chain');
      expect(response.body.ancestors).toHaveLength(2);

      // First ancestor is parent B
      expect(response.body.ancestors[0].id).toBe(experimentBId);
      expect(response.body.ancestors[0].branchDepth).toBe(1);
      expect(response.body.ancestors[0].creator.username).toBe(chefUser2.username);

      // Second ancestor is root A
      expect(response.body.ancestors[1].id).toBe(experimentAId);
      expect(response.body.ancestors[1].branchDepth).toBe(0);
      expect(response.body.ancestors[1].creator.username).toBe(chefUser1.username);

      // Full chain contains C, B, A
      expect(response.body.chain).toHaveLength(3);
      expect(response.body.chain[0].id).toBe(experimentCId);
      expect(response.body.chain[1].id).toBe(experimentBId);
      expect(response.body.chain[2].id).toBe(experimentAId);
    });
  });

  describe('EXPERIMENT TREE ENDPOINT', () => {
    it('13. GET /experiments/:id/tree returns the correct branch structure', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/v1/experiments/${experimentCId}/tree`)
        .expect(200);

      expect(response.body.rootId).toBe(experimentAId);
      expect(response.body.targetExperimentId).toBe(experimentCId);
      expect(response.body.totalNodes).toBe(3);

      // Tree root is A
      expect(response.body.tree.id).toBe(experimentAId);
      expect(response.body.tree.branchDepth).toBe(0);
      expect(response.body.tree.children).toHaveLength(1);

      // Child of A is B
      const childB = response.body.tree.children[0];
      expect(childB.id).toBe(experimentBId);
      expect(childB.parentId).toBe(experimentAId);
      expect(childB.branchDepth).toBe(1);
      expect(childB.children).toHaveLength(1);

      // Child of B is C
      const childC = childB.children[0];
      expect(childC.id).toBe(experimentCId);
      expect(childC.parentId).toBe(experimentBId);
      expect(childC.branchDepth).toBe(2);
      expect(childC.children).toHaveLength(0);
    });
  });

  describe('SECURITY & VALIDATION', () => {
    it('14. Unauthenticated creation and remixing is rejected with 401', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/experiments')
        .send({ title: 'Unauthorized Recipe' })
        .expect(401);

      await request(app.getHttpServer())
        .post(`/api/v1/experiments/${experimentAId}/remix`)
        .send({ title: 'Unauthorized Remix' })
        .expect(401);
    });

    it('15. Client cannot spoof creatorId in payload', async () => {
      const spoofedPayload = {
        title: 'Spoof Attempt Experiment',
        description: 'Attempting to impersonate another user via payload.',
        creatorId: '00000000-0000-4000-8000-000000000000',
        ingredients: [{ name: 'Salt', quantity: 1, unit: 'pinch' }],
        steps: [{ stepNumber: 1, instruction: 'Season lightly.' }],
        difficulty: 'easy',
        estimatedCost: { min: 10, max: 20, currency: 'INR' },
        estimatedTimeMinutes: 5,
      };

      const response = await request(app.getHttpServer())
        .post('/api/v1/experiments')
        .set('Authorization', `Bearer ${tokenUser1}`)
        .send(spoofedPayload)
        .expect(201);

      // creatorId must strictly be authenticated user 1, never the spoofed payload
      expect(response.body.creatorId).toBe(user1Id);
      expect(response.body.creatorId).not.toBe('00000000-0000-4000-8000-000000000000');
    });

    it('16. Invalid experiment ID is handled safely without leaking raw database errors', async () => {
      // Malformed UUID
      const malformedRes = await request(app.getHttpServer())
        .get('/api/v1/experiments/not-a-valid-uuid')
        .expect(400);

      expect(malformedRes.body).toHaveProperty('statusCode', 400);
      expect(malformedRes.body.message).toContain('Invalid experiment ID');
      expect(malformedRes.body).not.toHaveProperty('stack');

      // Non-existent UUID
      const notFoundRes = await request(app.getHttpServer())
        .get('/api/v1/experiments/00000000-0000-4000-8000-000000000000')
        .expect(404);

      expect(notFoundRes.body).toHaveProperty('statusCode', 404);
      expect(notFoundRes.body.message).toContain('was not found');
      expect(notFoundRes.body).not.toHaveProperty('stack');
    });

    it('17. PasswordHash and internal auth secrets are never exposed in any experiment response', async () => {
      const detailRes = await request(app.getHttpServer())
        .get(`/api/v1/experiments/${experimentAId}`)
        .expect(200);

      const jsonStr = JSON.stringify(detailRes.body);
      expect(jsonStr).not.toContain('passwordHash');
      expect(jsonStr).not.toContain('secret_hash');
      expect(jsonStr).not.toContain('jwt');

      const lineageRes = await request(app.getHttpServer())
        .get(`/api/v1/experiments/${experimentCId}/lineage`)
        .expect(200);

      const lineageJson = JSON.stringify(lineageRes.body);
      expect(lineageJson).not.toContain('passwordHash');
      expect(lineageJson).not.toContain('secret_hash');
    });

    it('18. Failed transactions do not leave partial experiment records', async () => {
      const initialCount = await prisma.experiment.count();

      // Attempt to create experiment with non-existent canonical ingredient
      const failingPayload = {
        title: 'Failing Transaction Experiment',
        description: 'Should abort completely and rollback atomic transaction.',
        ingredients: [
          {
            name: 'Ghost Ingredient',
            quantity: 50,
            unit: 'g',
            canonicalId: '00000000-0000-4000-8000-000000000000',
          },
        ],
        steps: [{ stepNumber: 1, instruction: 'Do nothing.' }],
        difficulty: 'easy',
        estimatedCost: { min: 50, max: 100, currency: 'INR' },
        estimatedTimeMinutes: 10,
      };

      await request(app.getHttpServer())
        .post('/api/v1/experiments')
        .set('Authorization', `Bearer ${tokenUser1}`)
        .send(failingPayload)
        .expect(400);

      const finalCount = await prisma.experiment.count();
      expect(finalCount).toBe(initialCount);
    });
  });
});
