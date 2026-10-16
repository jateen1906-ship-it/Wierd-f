import {
  CANONICAL_SEED_INGREDIENTS,
  seedCanonicalIngredients,
  SeedIngredientClient,
} from '../../prisma/seed';

describe('Canonical Ingredient Seeding', () => {
  describe('1. Canonical Ingredient Catalog Definitions', () => {
    it('should define exactly 21 canonical ingredients', () => {
      expect(CANONICAL_SEED_INGREDIENTS).toHaveLength(21);
    });

    it('should have unique ingredient names with no duplicates', () => {
      const names = CANONICAL_SEED_INGREDIENTS.map((i) => i.name.toLowerCase());
      const uniqueNames = new Set(names);
      expect(uniqueNames.size).toBe(CANONICAL_SEED_INGREDIENTS.length);
    });

    it('should ensure each ingredient has valid attributes', () => {
      for (const item of CANONICAL_SEED_INGREDIENTS) {
        expect(typeof item.name).toBe('string');
        expect(item.name.trim().length).toBeGreaterThan(0);

        expect(typeof item.category).toBe('string');
        expect(item.category.trim().length).toBeGreaterThan(0);

        expect(Array.isArray(item.commonSubstitutions)).toBe(true);
        expect(typeof item.isCommonAllergen).toBe('boolean');
      }
    });

    it('should contain expected key staple and experimental ingredients', () => {
      const nameSet = new Set(CANONICAL_SEED_INGREDIENTS.map((i) => i.name));
      const requiredItems = [
        'Tomato',
        'Onion',
        'Garlic',
        'Cheese',
        'Paneer',
        'Butter',
        'Milk',
        'Maggi',
        'Sourdough Bread',
        'Ramen Noodles',
        'Rice',
        'Soy Sauce',
        'Kimchi',
        'Gochujang',
        'Olive Oil',
        'Eggs',
        'Tofu',
        'Chicken Breast',
        'Salt',
        'Black Pepper',
        'Chili Flakes',
      ];

      for (const req of requiredItems) {
        expect(nameSet.has(req)).toBe(true);
      }
    });

    it('should correctly flag allergen status for known allergens and non-allergens', () => {
      const allergens = CANONICAL_SEED_INGREDIENTS.filter((i) => i.isCommonAllergen).map(
        (i) => i.name,
      );
      const nonAllergens = CANONICAL_SEED_INGREDIENTS.filter((i) => !i.isCommonAllergen).map(
        (i) => i.name,
      );

      expect(allergens).toEqual(
        expect.arrayContaining(['Cheese', 'Paneer', 'Butter', 'Milk', 'Soy Sauce', 'Eggs', 'Tofu']),
      );
      expect(nonAllergens).toEqual(
        expect.arrayContaining(['Tomato', 'Onion', 'Garlic', 'Maggi', 'Rice', 'Olive Oil', 'Salt']),
      );
    });
  });

  describe('2. seedCanonicalIngredients execution', () => {
    it('should call upsert for each canonical ingredient with proper payload', async () => {
      const upsertCalls: any[] = [];
      const mockClient: SeedIngredientClient = {
        ingredient: {
          upsert: jest.fn().mockImplementation(async (args) => {
            upsertCalls.push(args);
            return { id: 'mock-id', ...args.create };
          }),
        },
      };

      const count = await seedCanonicalIngredients(mockClient);

      expect(count).toBe(21);
      expect(mockClient.ingredient.upsert).toHaveBeenCalledTimes(21);

      // Verify the first item upsert structure
      const firstCall = upsertCalls[0];
      expect(firstCall.where).toEqual({ name: 'Tomato' });
      expect(firstCall.update).toEqual({
        category: 'vegetable',
        commonSubstitutions: ['Crushed canned tomatoes', 'Tomato puree'],
        isCommonAllergen: false,
      });
      expect(firstCall.create).toEqual(CANONICAL_SEED_INGREDIENTS[0]);
    });
  });

  describe('3. Repeatability & Idempotency', () => {
    it('should be safe to run multiple times without creating duplicate canonical ingredients', async () => {
      // Simulate database table with an in-memory map keyed by unique ingredient name
      const inMemoryDb = new Map<string, any>();
      let idCounter = 1;

      const mockClient: SeedIngredientClient = {
        ingredient: {
          upsert: jest.fn().mockImplementation(async ({ where, update, create }) => {
            const existing = inMemoryDb.get(where.name);
            if (existing) {
              const updated = {
                ...existing,
                ...update,
                updatedAt: new Date(),
              };
              inMemoryDb.set(where.name, updated);
              return updated;
            } else {
              const created = {
                id: `id-${idCounter++}`,
                ...create,
                createdAt: new Date(),
                updatedAt: new Date(),
              };
              inMemoryDb.set(where.name, created);
              return created;
            }
          }),
        },
      };

      // Run 1: First seed
      const firstRunCount = await seedCanonicalIngredients(mockClient);
      expect(firstRunCount).toBe(21);
      expect(inMemoryDb.size).toBe(21);

      const tomatoAfterFirstRun = inMemoryDb.get('Tomato');
      const tomatoId = tomatoAfterFirstRun.id;

      // Run 2: Second seed (repeat)
      const secondRunCount = await seedCanonicalIngredients(mockClient);
      expect(secondRunCount).toBe(21);
      expect(inMemoryDb.size).toBe(21); // No new duplicates

      // Run 3: Third seed (repeat)
      const thirdRunCount = await seedCanonicalIngredients(mockClient);
      expect(thirdRunCount).toBe(21);
      expect(inMemoryDb.size).toBe(21); // Still exactly 21

      // Ensure IDs and existing identities are preserved
      const tomatoAfterThirdRun = inMemoryDb.get('Tomato');
      expect(tomatoAfterThirdRun.id).toBe(tomatoId);
      expect(tomatoAfterThirdRun.name).toBe('Tomato');
      expect(tomatoAfterThirdRun.category).toBe('vegetable');
    });
  });

  describe('4. Non-Destructive Behavior', () => {
    it('should preserve existing user-created ingredients and never delete existing records', async () => {
      const inMemoryDb = new Map<string, any>();
      // Pre-existing custom ingredient created by a user
      const customUserIngredient = {
        id: 'custom-spice-id-999',
        name: 'Custom Smoked Paprika',
        category: 'spice_seasoning',
        commonSubstitutions: ['Paprika'],
        isCommonAllergen: false,
        createdAt: new Date('2026-01-01T00:00:00Z'),
        updatedAt: new Date('2026-01-01T00:00:00Z'),
      };
      inMemoryDb.set(customUserIngredient.name, customUserIngredient);

      const deleteSpy = jest.fn();
      const deleteManySpy = jest.fn();

      const mockClient: any = {
        ingredient: {
          upsert: jest.fn().mockImplementation(async ({ where, update, create }) => {
            const existing = inMemoryDb.get(where.name);
            if (existing) {
              const updated = { ...existing, ...update };
              inMemoryDb.set(where.name, updated);
              return updated;
            }
            const created = { id: `id-${Math.random()}`, ...create };
            inMemoryDb.set(where.name, created);
            return created;
          }),
          delete: deleteSpy,
          deleteMany: deleteManySpy,
        },
      };

      const count = await seedCanonicalIngredients(mockClient);

      // Seed added 21 canonical ingredients
      expect(count).toBe(21);
      // Total in DB is now 22 (1 custom + 21 canonical)
      expect(inMemoryDb.size).toBe(22);
      // Custom ingredient was not touched or deleted
      expect(inMemoryDb.get('Custom Smoked Paprika')).toEqual(customUserIngredient);
      // No delete operations were called
      expect(deleteSpy).not.toHaveBeenCalled();
      expect(deleteManySpy).not.toHaveBeenCalled();
    });
  });
});
