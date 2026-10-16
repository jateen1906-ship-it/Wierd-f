import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, VersioningType } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { AllExceptionsFilter } from '../src/common/filters/http-exception.filter';
import { PrismaService } from '../src/database/prisma.service';
import { CANONICAL_SEED_INGREDIENTS } from '../prisma/seed';

describe('IngredientsController (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  const chefUser = {
    username: 'e2e_chef_ingredient_tester',
    email: 'chef_ingredient@wierd.food',
    password: 'Password123!Secure',
    displayName: 'Chef Ingredient Tester',
  };

  let tokenUser: string;
  let createdTestIds: string[] = [];

  // References to seeded ingredients for testing
  let tomatoIngredient: any;
  let cheeseIngredient: any;
  let paneerIngredient: any;
  let maggiIngredient: any;

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

    // Clean up test user if existed
    await prisma.user.deleteMany({
      where: {
        OR: [{ email: chefUser.email }, { username: chefUser.username }],
      },
    });

    // Register user for experiment integration tests
    const regRes = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send(chefUser)
      .expect(201);
    tokenUser = regRes.body.accessToken;

    // Seed canonical test ingredients
    for (const item of CANONICAL_SEED_INGREDIENTS) {
      const ing = await prisma.ingredient.upsert({
        where: { name: item.name },
        update: {
          category: item.category,
          commonSubstitutions: item.commonSubstitutions,
          isCommonAllergen: item.isCommonAllergen,
        },
        create: item,
      });
      createdTestIds.push(ing.id);
    }

    tomatoIngredient = await prisma.ingredient.findUnique({ where: { name: 'Tomato' } });
    cheeseIngredient = await prisma.ingredient.findUnique({ where: { name: 'Cheese' } });
    paneerIngredient = await prisma.ingredient.findUnique({ where: { name: 'Paneer' } });
    maggiIngredient = await prisma.ingredient.findUnique({ where: { name: 'Maggi' } });
  });

  afterAll(async () => {
    if (prisma) {
      // Clean up test user
      await prisma.user.deleteMany({
        where: {
          OR: [{ email: chefUser.email }, { username: chefUser.username }],
        },
      });
    }
    await app.close();
  });

  describe('1. Searching by ingredient name', () => {
    it('should find ingredient matching exact name substring', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/ingredients?query=tomato')
        .expect(200);

      expect(response.body).toHaveProperty('items');
      expect(response.body).toHaveProperty('total');
      expect(response.body.items.length).toBeGreaterThanOrEqual(1);

      const found = response.body.items.find((i: any) => i.name === 'Tomato');
      expect(found).toBeDefined();
      expect(found.category).toBe('vegetable');
      expect(found.isCommonAllergen).toBe(false);
    });

    it('should find Maggi snack instant noodles', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/ingredients?query=Maggi')
        .expect(200);

      expect(response.body.items.length).toBeGreaterThanOrEqual(1);
      const found = response.body.items.find((i: any) => i.name === 'Maggi');
      expect(found).toBeDefined();
      expect(found.category).toBe('snack_instant');
    });

    it('should find paneer dairy ingredient', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/ingredients?query=paneer')
        .expect(200);

      expect(response.body.items.length).toBeGreaterThanOrEqual(1);
      const found = response.body.items.find((i: any) => i.name === 'Paneer');
      expect(found).toBeDefined();
      expect(found.category).toBe('dairy');
    });
  });

  describe('2. Case-insensitive search', () => {
    it('should match ingredients regardless of uppercase or lowercase query', async () => {
      const upperRes = await request(app.getHttpServer())
        .get('/api/v1/ingredients?query=TOMATO')
        .expect(200);

      const lowerRes = await request(app.getHttpServer())
        .get('/api/v1/ingredients?query=tomato')
        .expect(200);

      const mixedRes = await request(app.getHttpServer())
        .get('/api/v1/ingredients?query=ToMaTo')
        .expect(200);

      expect(upperRes.body.total).toBe(lowerRes.body.total);
      expect(lowerRes.body.total).toBe(mixedRes.body.total);
      expect(upperRes.body.items.some((i: any) => i.name === 'Tomato')).toBe(true);
    });

    it('should case-insensitively match cheese', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/ingredients?query=CHEESE')
        .expect(200);

      expect(response.body.items.some((i: any) => i.name === 'Cheese')).toBe(true);
    });
  });

  describe('3. Empty search results', () => {
    it('should return empty items array and total 0 when no ingredient matches', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/ingredients?query=nonexistent_xyz_ingredient_999')
        .expect(200);

      expect(response.body).toEqual({
        items: [],
        total: 0,
        page: 1,
        limit: 20,
        totalPages: 0,
        hasMore: false,
      });
    });
  });

  describe('4. Pagination', () => {
    it('should paginate results with stable ordering', async () => {
      const page1Res = await request(app.getHttpServer())
        .get('/api/v1/ingredients?page=1&limit=5')
        .expect(200);

      expect(page1Res.body.page).toBe(1);
      expect(page1Res.body.limit).toBe(5);
      expect(page1Res.body.items).toHaveLength(5);
      expect(page1Res.body.hasMore).toBe(true);

      const page2Res = await request(app.getHttpServer())
        .get('/api/v1/ingredients?page=2&limit=5')
        .expect(200);

      expect(page2Res.body.page).toBe(2);
      expect(page2Res.body.limit).toBe(5);
      expect(page2Res.body.items).toHaveLength(5);

      // Verify no overlap between page 1 and page 2
      const page1Ids = page1Res.body.items.map((i: any) => i.id);
      const page2Ids = page2Res.body.items.map((i: any) => i.id);
      const overlap = page1Ids.filter((id: string) => page2Ids.includes(id));
      expect(overlap).toHaveLength(0);
    });
  });

  describe('5. Invalid pagination parameters', () => {
    it('should reject non-positive page number with 400 Bad Request', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/ingredients?page=0')
        .expect(400);

      expect(response.body).toHaveProperty('statusCode', 400);
      expect(response.body.message).toBe('Validation failed');
    });

    it('should reject negative limit with 400 Bad Request', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/ingredients?limit=-5')
        .expect(400);

      expect(response.body).toHaveProperty('statusCode', 400);
    });

    it('should reject limit exceeding maximum allowable threshold with 400 Bad Request', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/ingredients?limit=500')
        .expect(400);

      expect(response.body).toHaveProperty('statusCode', 400);
    });

    it('should reject non-numeric pagination parameters with 400 Bad Request', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/ingredients?page=abc')
        .expect(400);

      expect(response.body).toHaveProperty('statusCode', 400);
    });
  });

  describe('6. Getting an existing ingredient', () => {
    it('should return complete sanitized ingredient record', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/v1/ingredients/${tomatoIngredient.id}`)
        .expect(200);

      expect(response.body.id).toBe(tomatoIngredient.id);
      expect(response.body.name).toBe('Tomato');
      expect(response.body.category).toBe('vegetable');
      expect(response.body.isCommonAllergen).toBe(false);
      expect(Array.isArray(response.body.commonSubstitutions)).toBe(true);
      expect(response.body).toHaveProperty('createdAt');
      expect(response.body).toHaveProperty('updatedAt');
    });
  });

  describe('7. Getting a nonexistent ingredient', () => {
    it('should return sanitized 404 when valid UUID does not exist', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/ingredients/00000000-0000-4000-8000-000000000000')
        .expect(404);

      expect(response.body).toHaveProperty('statusCode', 404);
      expect(response.body.message).toContain('was not found');
      expect(response.body).not.toHaveProperty('stack');
    });
  });

  describe('8. Listing categories', () => {
    it('should return distinct canonical categories supported by platform', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/ingredients/categories')
        .expect(200);

      expect(response.body).toHaveProperty('categories');
      expect(response.body).toHaveProperty('total');
      expect(Array.isArray(response.body.categories)).toBe(true);
      expect(response.body.categories).toContain('vegetable');
      expect(response.body.categories).toContain('dairy');
      expect(response.body.categories).toContain('snack_instant');
      expect(response.body.categories).toContain('protein');
      expect(response.body.categories).toContain('staple');
    });
  });

  describe('9. Safe handling of ingredient allergen information', () => {
    it('should correctly reflect allergen flags for dairy and non-dairy ingredients', async () => {
      const cheeseRes = await request(app.getHttpServer())
        .get(`/api/v1/ingredients/${cheeseIngredient.id}`)
        .expect(200);
      expect(cheeseRes.body.isCommonAllergen).toBe(true);

      const paneerRes = await request(app.getHttpServer())
        .get(`/api/v1/ingredients/${paneerIngredient.id}`)
        .expect(200);
      expect(paneerRes.body.isCommonAllergen).toBe(true);

      const onionRes = await request(app.getHttpServer())
        .get('/api/v1/ingredients?query=Onion')
        .expect(200);
      const onion = onionRes.body.items.find((i: any) => i.name === 'Onion');
      expect(onion.isCommonAllergen).toBe(false);
    });
  });

  describe('10. Existing experiment creation remains functional', () => {
    let createdExperimentId: string;

    it('should create root experiment referencing canonical ingredients from catalog', async () => {
      const payload = {
        title: 'Paneer Maggi Mashup',
        description: 'Experimenting with charred paneer cubes over spicy Maggi noodles.',
        ingredients: [
          {
            name: 'Maggi Noodles',
            quantity: 1,
            unit: 'packet',
            canonicalId: maggiIngredient.id,
            isCustomAddition: false,
          },
          {
            name: 'Paneer Cubes',
            quantity: 100,
            unit: 'g',
            canonicalId: paneerIngredient.id,
            preparation: 'lightly charred',
            isCustomAddition: true,
          },
          {
            name: 'Diced Tomato',
            quantity: 50,
            unit: 'g',
            canonicalId: tomatoIngredient.id,
            isCustomAddition: true,
          },
        ],
        steps: [
          { stepNumber: 1, instruction: 'Char paneer in butter.' },
          { stepNumber: 2, instruction: 'Cook Maggi with tastemaker and folded tomatoes.' },
        ],
        difficulty: 'easy',
        estimatedCost: { min: 80, max: 150, currency: 'INR' },
        estimatedTimeMinutes: 12,
      };

      const response = await request(app.getHttpServer())
        .post('/api/v1/experiments')
        .set('Authorization', `Bearer ${tokenUser}`)
        .send(payload)
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.title).toBe(payload.title);
      expect(response.body.ingredients).toHaveLength(3);
      expect(response.body.ingredients[0].canonicalId).toBe(maggiIngredient.id);
      expect(response.body.ingredients[1].canonicalId).toBe(paneerIngredient.id);
      expect(response.body.ingredients[2].canonicalId).toBe(tomatoIngredient.id);

      createdExperimentId = response.body.id;
    });

    describe('11. Existing remix lineage remains functional', () => {
      it('should remix experiment referencing canonical ingredients and increment lineage', async () => {
        const remixPayload = {
          title: 'Cheesy Paneer Maggi Delight (Remix)',
          description: 'Added melted cheese on top of the paneer Maggi.',
          transformations: [
            {
              type: 'ingredient_added',
              description: 'Added shredded processed cheese',
              newValue: 'Cheese',
            },
          ],
          ingredients: [
            {
              name: 'Maggi Noodles',
              quantity: 1,
              unit: 'packet',
              canonicalId: maggiIngredient.id,
            },
            {
              name: 'Paneer Cubes',
              quantity: 100,
              unit: 'g',
              canonicalId: paneerIngredient.id,
            },
            {
              name: 'Shredded Cheese',
              quantity: 40,
              unit: 'g',
              canonicalId: cheeseIngredient.id,
              isCustomAddition: true,
            },
          ],
          steps: [
            { stepNumber: 1, instruction: 'Cook Maggi with paneer.' },
            { stepNumber: 2, instruction: 'Melt cheese under broiler.' },
          ],
        };

        const remixRes = await request(app.getHttpServer())
          .post(`/api/v1/experiments/${createdExperimentId}/remix`)
          .set('Authorization', `Bearer ${tokenUser}`)
          .send(remixPayload)
          .expect(201);

        expect(remixRes.body.parentId).toBe(createdExperimentId);
        expect(remixRes.body.branchDepth).toBe(1);
        expect(
          remixRes.body.ingredients.some((i: any) => i.canonicalId === cheeseIngredient.id),
        ).toBe(true);
      });
    });
  });

  describe('12. Database errors do not expose sensitive internals', () => {
    it('should safely reject malformed UUID with 400 Bad Request without leaking SQL details', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/ingredients/invalid-uuid-format-not-hex')
        .expect(400);

      expect(response.body).toHaveProperty('statusCode', 400);
      expect(response.body.message).toContain('Invalid ingredient ID');
      expect(response.body).not.toHaveProperty('stack');
      expect(JSON.stringify(response.body)).not.toContain('prisma');
      expect(JSON.stringify(response.body)).not.toContain('SELECT');
    });
  });
});
