import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const CANONICAL_SEED_INGREDIENTS = [
  {
    name: 'Tomato',
    category: 'vegetable',
    commonSubstitutions: ['Crushed canned tomatoes', 'Tomato puree'],
    isCommonAllergen: false,
  },
  {
    name: 'Onion',
    category: 'vegetable',
    commonSubstitutions: ['Shallots', 'Leeks'],
    isCommonAllergen: false,
  },
  {
    name: 'Garlic',
    category: 'vegetable',
    commonSubstitutions: ['Garlic powder', 'Shallots'],
    isCommonAllergen: false,
  },
  {
    name: 'Cheese',
    category: 'dairy',
    commonSubstitutions: ['Nutritional yeast', 'Vegan cheese'],
    isCommonAllergen: true,
  },
  {
    name: 'Paneer',
    category: 'dairy',
    commonSubstitutions: ['Tofu', 'Halloumi'],
    isCommonAllergen: true,
  },
  {
    name: 'Butter',
    category: 'dairy',
    commonSubstitutions: ['Ghee', 'Olive oil'],
    isCommonAllergen: true,
  },
  {
    name: 'Milk',
    category: 'dairy',
    commonSubstitutions: ['Oat milk', 'Almond milk'],
    isCommonAllergen: true,
  },
  {
    name: 'Maggi',
    category: 'snack_instant',
    commonSubstitutions: ['Ramen noodles', 'Top Ramen'],
    isCommonAllergen: false,
  },
  {
    name: 'Sourdough Bread',
    category: 'bakery',
    commonSubstitutions: ['Ciabatta', 'Brioche'],
    isCommonAllergen: false,
  },
  {
    name: 'Ramen Noodles',
    category: 'staple',
    commonSubstitutions: ['Udon', 'Soba'],
    isCommonAllergen: false,
  },
  {
    name: 'Rice',
    category: 'staple',
    commonSubstitutions: ['Quinoa', 'Cauliflower rice'],
    isCommonAllergen: false,
  },
  {
    name: 'Soy Sauce',
    category: 'sauce_condiment',
    commonSubstitutions: ['Tamari', 'Coconut aminos'],
    isCommonAllergen: true,
  },
  {
    name: 'Kimchi',
    category: 'vegetable',
    commonSubstitutions: ['Sauerkraut', 'Pickled cabbage'],
    isCommonAllergen: false,
  },
  {
    name: 'Gochujang',
    category: 'sauce_condiment',
    commonSubstitutions: ['Sriracha with miso', 'Chili bean paste'],
    isCommonAllergen: false,
  },
  {
    name: 'Olive Oil',
    category: 'oil_fat',
    commonSubstitutions: ['Avocado oil', 'Canola oil'],
    isCommonAllergen: false,
  },
  {
    name: 'Eggs',
    category: 'protein',
    commonSubstitutions: ['Flax egg', 'Applesauce'],
    isCommonAllergen: true,
  },
  {
    name: 'Tofu',
    category: 'protein',
    commonSubstitutions: ['Tempeh', 'Paneer'],
    isCommonAllergen: true,
  },
  {
    name: 'Chicken Breast',
    category: 'protein',
    commonSubstitutions: ['Turkey breast', 'Tofu'],
    isCommonAllergen: false,
  },
  {
    name: 'Salt',
    category: 'spice_seasoning',
    commonSubstitutions: ['Sea salt', 'Kosher salt'],
    isCommonAllergen: false,
  },
  {
    name: 'Black Pepper',
    category: 'spice_seasoning',
    commonSubstitutions: ['White pepper', 'Szechuan pepper'],
    isCommonAllergen: false,
  },
  {
    name: 'Chili Flakes',
    category: 'spice_seasoning',
    commonSubstitutions: ['Cayenne powder', 'Paprika'],
    isCommonAllergen: false,
  },
];

export type SeedIngredientClient = {
  ingredient: {
    upsert: (args: {
      where: { name: string };
      update: {
        category: string;
        commonSubstitutions: string[];
        isCommonAllergen: boolean;
      };
      create: {
        name: string;
        category: string;
        commonSubstitutions: string[];
        isCommonAllergen: boolean;
      };
    }) => Promise<any>;
  };
};

export async function seedCanonicalIngredients(
  client: SeedIngredientClient = prisma,
): Promise<number> {
  let count = 0;
  for (const item of CANONICAL_SEED_INGREDIENTS) {
    await client.ingredient.upsert({
      where: { name: item.name },
      update: {
        category: item.category,
        commonSubstitutions: item.commonSubstitutions,
        isCommonAllergen: item.isCommonAllergen,
      },
      create: item,
    });
    count++;
  }
  return count;
}

async function main() {
  console.log('Seeding canonical ingredient catalog...');
  const count = await seedCanonicalIngredients(prisma);
  console.log(`Successfully seeded ${count} canonical ingredients.`);
}

if (process.env.NODE_ENV !== 'test' && require.main === module) {
  main()
    .catch((e) => {
      console.error('Seed error:', e);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
