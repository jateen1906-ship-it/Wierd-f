import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { IngredientsService, CANONICAL_CATEGORIES } from './ingredients.service';
import { PrismaService } from '../database/prisma.service';

describe('IngredientsService', () => {
  let service: IngredientsService;
  let prisma: any;

  const mockIngredients = [
    {
      id: '11111111-1111-4111-8111-111111111111',
      name: 'Tomato',
      category: 'vegetable',
      commonSubstitutions: ['Crushed canned tomatoes'],
      isCommonAllergen: false,
      createdAt: new Date('2026-09-01T00:00:00Z'),
      updatedAt: new Date('2026-09-01T00:00:00Z'),
    },
    {
      id: '22222222-2222-4222-8222-222222222222',
      name: 'Cheese',
      category: 'dairy',
      commonSubstitutions: ['Nutritional yeast'],
      isCommonAllergen: true,
      createdAt: new Date('2026-09-01T00:00:00Z'),
      updatedAt: new Date('2026-09-01T00:00:00Z'),
    },
    {
      id: '33333333-3333-4333-8333-333333333333',
      name: 'Paneer',
      category: 'dairy',
      commonSubstitutions: ['Tofu'],
      isCommonAllergen: true,
      createdAt: new Date('2026-09-01T00:00:00Z'),
      updatedAt: new Date('2026-09-01T00:00:00Z'),
    },
    {
      id: '44444444-4444-4444-8444-444444444444',
      name: 'Onion',
      category: 'vegetable',
      commonSubstitutions: ['Shallots'],
      isCommonAllergen: false,
      createdAt: new Date('2026-09-01T00:00:00Z'),
      updatedAt: new Date('2026-09-01T00:00:00Z'),
    },
    {
      id: '55555555-5555-4555-8555-555555555555',
      name: 'Maggi',
      category: 'snack_instant',
      commonSubstitutions: ['Ramen noodles'],
      isCommonAllergen: false,
      createdAt: new Date('2026-09-01T00:00:00Z'),
      updatedAt: new Date('2026-09-01T00:00:00Z'),
    },
  ];

  beforeEach(async () => {
    prisma = {
      ingredient: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        count: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        IngredientsService,
        {
          provide: PrismaService,
          useValue: prisma,
        },
      ],
    }).compile();

    service = module.get<IngredientsService>(IngredientsService);
  });

  describe('findAll (Search and List)', () => {
    it('1. should search ingredients by name', async () => {
      prisma.ingredient.count.mockResolvedValue(1);
      prisma.ingredient.findMany.mockResolvedValue([mockIngredients[0]]);

      const result = await service.findAll({ query: 'tomato', page: 1, limit: 20 });

      expect(result.items).toHaveLength(1);
      expect(result.items[0]?.name).toBe('Tomato');
      expect(result.total).toBe(1);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(20);
      expect(result.totalPages).toBe(1);
      expect(result.hasMore).toBe(false);

      expect(prisma.ingredient.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            name: {
              contains: 'tomato',
              mode: 'insensitive',
            },
          },
          skip: 0,
          take: 20,
        }),
      );
    });

    it('2. should perform case-insensitive search', async () => {
      prisma.ingredient.count.mockResolvedValue(1);
      prisma.ingredient.findMany.mockResolvedValue([mockIngredients[1]]);

      const result = await service.findAll({ query: 'CHEESE', page: 1, limit: 20 });

      expect(result.items).toHaveLength(1);
      expect(result.items[0]?.name).toBe('Cheese');
      expect(prisma.ingredient.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            name: {
              contains: 'CHEESE',
              mode: 'insensitive',
            },
          },
        }),
      );
    });

    it('3. should return empty items when search matches nothing', async () => {
      prisma.ingredient.count.mockResolvedValue(0);
      prisma.ingredient.findMany.mockResolvedValue([]);

      const result = await service.findAll({ query: 'unicorn_pepper', page: 1, limit: 20 });

      expect(result.items).toEqual([]);
      expect(result.total).toBe(0);
      expect(result.totalPages).toBe(0);
      expect(result.hasMore).toBe(false);
    });

    it('4. should paginate ingredients correctly', async () => {
      prisma.ingredient.count.mockResolvedValue(25);
      prisma.ingredient.findMany.mockResolvedValue([mockIngredients[2]]);

      const result = await service.findAll({ page: 2, limit: 10 });

      expect(result.page).toBe(2);
      expect(result.limit).toBe(10);
      expect(result.total).toBe(25);
      expect(result.totalPages).toBe(3);
      expect(result.hasMore).toBe(true);

      expect(prisma.ingredient.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 10,
          take: 10,
          orderBy: { name: 'asc' },
        }),
      );
    });

    it('5. should filter by category when provided', async () => {
      prisma.ingredient.count.mockResolvedValue(2);
      prisma.ingredient.findMany.mockResolvedValue([mockIngredients[1], mockIngredients[2]]);

      const result = await service.findAll({ category: 'dairy', page: 1, limit: 20 });

      expect(result.items).toHaveLength(2);
      expect(prisma.ingredient.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { category: 'dairy' },
        }),
      );
    });
  });

  describe('findOne', () => {
    it('6. should return mapped ingredient details for existing ID', async () => {
      const cheese = mockIngredients[1]!;
      prisma.ingredient.findUnique.mockResolvedValue(cheese);

      const result = await service.findOne(cheese.id);

      expect(result.id).toBe(cheese.id);
      expect(result.name).toBe('Cheese');
      expect(result.category).toBe('dairy');
      expect(result.isCommonAllergen).toBe(true);
      expect(result.commonSubstitutions).toEqual(['Nutritional yeast']);
      expect(result.createdAt).toBe(cheese.createdAt.toISOString());
    });

    it('7. should throw NotFoundException when ingredient ID does not exist', async () => {
      prisma.ingredient.findUnique.mockResolvedValue(null);

      await expect(service.findOne('99999999-9999-4999-8999-999999999999')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('getCategories', () => {
    it('8. should return distinct canonical categories sorted alphabetically', async () => {
      prisma.ingredient.findMany.mockResolvedValue([
        { category: 'dairy' },
        { category: 'vegetable' },
        { category: 'snack_instant' },
      ]);

      const result = await service.getCategories();

      expect(result.categories).toBeDefined();
      expect(result.categories.length).toBeGreaterThanOrEqual(CANONICAL_CATEGORIES.length);
      expect(result.categories).toContain('dairy');
      expect(result.categories).toContain('vegetable');
      expect(result.categories).toContain('snack_instant');

      // Verify array is sorted
      const copy = [...result.categories];
      copy.sort();
      expect(result.categories).toEqual(copy);
    });
  });

  describe('Allergen information integrity', () => {
    it('9. should accurately expose allergen flags without data alteration', async () => {
      prisma.ingredient.findUnique.mockResolvedValue(mockIngredients[0]); // Tomato: allergen=false
      const tomato = await service.findOne(mockIngredients[0]!.id);
      expect(tomato.isCommonAllergen).toBe(false);

      prisma.ingredient.findUnique.mockResolvedValue(mockIngredients[2]); // Paneer: allergen=true
      const paneer = await service.findOne(mockIngredients[2]!.id);
      expect(paneer.isCommonAllergen).toBe(true);
    });
  });
});
