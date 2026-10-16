import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { ExperimentsService } from './experiments.service';
import { PrismaService } from '../database/prisma.service';
import type { CreateExperimentDto } from './dto/create-experiment.dto';
import type { RemixExperimentDto } from './dto/remix-experiment.dto';

describe('ExperimentsService', () => {
  let service: ExperimentsService;
  let prisma: any;

  const mockCreator = {
    id: '11111111-1111-4111-8111-111111111111',
    username: 'food_scientist',
    displayName: 'Food Scientist',
    email: 'scientist@wierd.food',
    passwordHash: 'secret_hash_never_exposed',
    avatarUrl: 'https://example.com/avatar.png',
    skillLevel: 'intermediate',
    createdAt: new Date('2026-09-01T00:00:00Z'),
    updatedAt: new Date('2026-09-01T00:00:00Z'),
  };

  const sampleCreateDto: CreateExperimentDto = {
    title: 'Smoked Gochujang Carbonara',
    description: 'Italian-Korean fusion experimenting with fermented chili heat.',
    ingredients: [
      {
        name: 'Spaghetti',
        quantity: 200,
        unit: 'g',
        preparation: 'al dente',
        isOptional: false,
        isCustomAddition: false,
      },
      {
        name: 'Gochujang',
        quantity: 30,
        unit: 'g',
        preparation: 'whisked into egg yolks',
        isOptional: false,
        isCustomAddition: true,
      },
    ],
    steps: [
      { stepNumber: 1, instruction: 'Boil salted water and cook spaghetti.' },
      { stepNumber: 2, instruction: 'Whisk eggs with gochujang paste.' },
    ],
    difficulty: 'medium',
    estimatedCost: { min: 150, max: 250, currency: 'INR' },
    estimatedTimeMinutes: 20,
  };

  beforeEach(async () => {
    prisma = {
      experiment: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      experimentIngredient: {
        createMany: jest.fn(),
      },
      ingredient: {
        findMany: jest.fn().mockResolvedValue([]),
      },
      $transaction: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ExperimentsService,
        {
          provide: PrismaService,
          useValue: prisma,
        },
      ],
    }).compile();

    service = module.get<ExperimentsService>(ExperimentsService);
  });

  describe('create (Root Experiment)', () => {
    it('should create a root experiment with parentId=null, rootId=own ID, branchDepth=0', async () => {
      let createdExperimentData: any;

      prisma.$transaction.mockImplementation(async (callback: any) => {
        const tx = {
          experiment: {
            create: jest.fn().mockImplementation(({ data }) => {
              createdExperimentData = data;
              return {
                ...data,
                createdAt: new Date('2026-09-10T10:00:00Z'),
                updatedAt: new Date('2026-09-10T10:00:00Z'),
                remixCount: 0,
                cookCount: 0,
                voteCount: 0,
                resultCount: 0,
              };
            }),
            findUnique: jest.fn().mockImplementation(() => ({
              ...createdExperimentData,
              creator: mockCreator,
              ingredients: [
                {
                  id: 'ing-1',
                  experimentId: createdExperimentData.id,
                  canonicalId: null,
                  name: 'Spaghetti',
                  quantity: 200,
                  unit: 'g',
                  preparation: 'al dente',
                  isOptional: false,
                  isCustomAddition: false,
                  createdAt: new Date(),
                  updatedAt: new Date(),
                },
              ],
              createdAt: new Date('2026-09-10T10:00:00Z'),
              updatedAt: new Date('2026-09-10T10:00:00Z'),
              remixCount: 0,
              cookCount: 0,
              voteCount: 0,
              resultCount: 0,
            })),
          },
          experimentIngredient: {
            createMany: jest.fn().mockResolvedValue({ count: 2 }),
          },
        };
        return callback(tx);
      });

      const result = await service.create(mockCreator.id, sampleCreateDto);

      expect(result).toBeDefined();
      expect(result.id).toBeDefined();
      expect(result.parentId).toBeNull();
      expect(result.rootId).toBe(result.id);
      expect(result.branchDepth).toBe(0);
      expect(result.creatorId).toBe(mockCreator.id);
      expect(result.creator.username).toBe(mockCreator.username);
      expect((result.creator as any).passwordHash).toBeUndefined();
      expect((result.creator as any).email).toBeUndefined();
      expect(result.title).toBe(sampleCreateDto.title);
    });

    it('should reject creation if a canonical ingredient ID does not exist', async () => {
      prisma.ingredient.findMany.mockResolvedValue([]); // returns no existing ingredients

      const dtoWithCanonical: CreateExperimentDto = {
        ...sampleCreateDto,
        ingredients: [
          {
            name: 'Special Salt',
            quantity: 5,
            unit: 'g',
            canonicalId: '99999999-9999-4999-8999-999999999999',
          },
        ],
      };

      await expect(service.create(mockCreator.id, dtoWithCanonical)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('findOne', () => {
    it('should return experiment details when found', async () => {
      const mockExp = {
        id: '22222222-2222-4222-8222-222222222222',
        creatorId: mockCreator.id,
        creator: mockCreator,
        parentId: null,
        rootId: '22222222-2222-4222-8222-222222222222',
        branchDepth: 0,
        transformations: null,
        title: 'Root Dish',
        description: 'Original description',
        steps: [{ stepNumber: 1, instruction: 'Step 1' }],
        difficulty: 'easy',
        estimatedCost: { min: 100, max: 200, currency: 'INR' },
        estimatedTimeMinutes: 15,
        heroMedia: null,
        aiMetadata: null,
        safetyStatus: 'SAFE',
        remixCount: 3,
        cookCount: 5,
        voteCount: 12,
        resultCount: 2,
        ingredients: [],
        createdAt: new Date('2026-09-10T10:00:00Z'),
        updatedAt: new Date('2026-09-10T10:00:00Z'),
      };

      prisma.experiment.findUnique.mockResolvedValue(mockExp);

      const result = await service.findOne(mockExp.id);

      expect(result.id).toBe(mockExp.id);
      expect(result.creator.username).toBe(mockCreator.username);
      expect((result.creator as any).passwordHash).toBeUndefined();
    });

    it('should throw NotFoundException when experiment does not exist', async () => {
      prisma.experiment.findUnique.mockResolvedValue(null);

      await expect(service.findOne('33333333-3333-4333-8333-333333333333')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('remix (Branching)', () => {
    const parentExperiment = {
      id: 'parent-1111-4111-8111-111111111111',
      creatorId: mockCreator.id,
      parentId: null,
      rootId: 'parent-1111-4111-8111-111111111111',
      branchDepth: 0,
      title: 'Original Kimchi Grilled Cheese',
      description: 'Original spicy melt',
      steps: [{ stepNumber: 1, instruction: 'Grill with butter' }],
      difficulty: 'easy',
      estimatedCost: { min: 80, max: 120, currency: 'INR' },
      estimatedTimeMinutes: 10,
      heroMedia: null,
      safetyStatus: 'SAFE',
      remixCount: 0,
      createdAt: new Date('2026-09-10T10:00:00Z'),
      updatedAt: new Date('2026-09-10T10:00:00Z'),
    };

    const remixDto: RemixExperimentDto = {
      title: 'Bacon Kimchi Sourdough Melt',
      description: 'Remix with crispy smoked bacon and rustic sourdough.',
      transformations: [
        {
          type: 'ingredient_added',
          description: 'Added thick-cut smoked bacon',
          newValue: 'Bacon',
        },
        {
          type: 'ingredient_substituted',
          description: 'Substituted white bread with sourdough',
          previousValue: 'White bread',
          newValue: 'Sourdough bread',
        },
      ],
      ingredients: [
        { name: 'Sourdough bread', quantity: 2, unit: 'slice' },
        { name: 'Bacon', quantity: 3, unit: 'slice' },
        { name: 'Kimchi', quantity: 50, unit: 'g' },
      ],
      steps: [{ stepNumber: 1, instruction: 'Crisp bacon, assemble, and press on skillet' }],
    };

    it('should create a remix branching from parent and maintain lineage immutability', async () => {
      let createdRemixData: any;
      let parentUpdatedData: any;

      prisma.$transaction.mockImplementation(async (callback: any) => {
        const tx = {
          experiment: {
            findUnique: jest.fn().mockImplementation(({ where }) => {
              if (where.id === parentExperiment.id) {
                return parentExperiment;
              }
              return {
                ...createdRemixData,
                creator: mockCreator,
                ingredients: [],
                createdAt: new Date('2026-09-11T12:00:00Z'),
                updatedAt: new Date('2026-09-11T12:00:00Z'),
                remixCount: 0,
                cookCount: 0,
                voteCount: 0,
                resultCount: 0,
              };
            }),
            update: jest.fn().mockImplementation(({ where, data }) => {
              parentUpdatedData = { where, data };
              return { ...parentExperiment, remixCount: 1 };
            }),
            create: jest.fn().mockImplementation(({ data }) => {
              createdRemixData = data;
              return {
                ...data,
                createdAt: new Date('2026-09-11T12:00:00Z'),
                updatedAt: new Date('2026-09-11T12:00:00Z'),
                remixCount: 0,
                cookCount: 0,
                voteCount: 0,
                resultCount: 0,
              };
            }),
          },
          experimentIngredient: {
            createMany: jest.fn().mockResolvedValue({ count: 3 }),
          },
        };
        return callback(tx);
      });

      const remixUser = '44444444-4444-4444-8444-444444444444';
      const result = await service.remix(parentExperiment.id, remixUser, remixDto);

      expect(result).toBeDefined();
      expect(result.id).not.toBe(parentExperiment.id);
      expect(result.parentId).toBe(parentExperiment.id);
      expect(result.rootId).toBe(parentExperiment.rootId);
      expect(result.branchDepth).toBe(parentExperiment.branchDepth + 1);
      expect(result.creatorId).toBe(remixUser);
      expect(result.transformations).toEqual(remixDto.transformations);
      expect(parentUpdatedData.data).toEqual({ remixCount: { increment: 1 } });
    });

    it('should throw NotFoundException if parent experiment does not exist', async () => {
      prisma.$transaction.mockImplementation(async (callback: any) => {
        const tx = {
          experiment: {
            findUnique: jest.fn().mockResolvedValue(null),
          },
        };
        return callback(tx);
      });

      await expect(service.remix('non-existent-id', mockCreator.id, remixDto)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('Multi-level Lineage & Tree', () => {
    const nodeA = {
      id: '10000000-0000-4000-8000-000000000001',
      title: 'Experiment A (Root)',
      creatorId: mockCreator.id,
      creator: mockCreator,
      parentId: null,
      rootId: '10000000-0000-4000-8000-000000000001',
      branchDepth: 0,
      createdAt: new Date('2026-09-01T00:00:00Z'),
      updatedAt: new Date('2026-09-01T00:00:00Z'),
      remixCount: 1,
      cookCount: 5,
      voteCount: 10,
      resultCount: 2,
    };

    const nodeB = {
      id: '10000000-0000-4000-8000-000000000002',
      title: 'Experiment B (Remix of A)',
      creatorId: mockCreator.id,
      creator: mockCreator,
      parentId: nodeA.id,
      rootId: nodeA.id,
      branchDepth: 1,
      createdAt: new Date('2026-09-02T00:00:00Z'),
      updatedAt: new Date('2026-09-02T00:00:00Z'),
      remixCount: 1,
      cookCount: 3,
      voteCount: 6,
      resultCount: 1,
    };

    const nodeC = {
      id: '10000000-0000-4000-8000-000000000003',
      title: 'Experiment C (Remix of B)',
      creatorId: mockCreator.id,
      creator: mockCreator,
      parentId: nodeB.id,
      rootId: nodeA.id,
      branchDepth: 2,
      createdAt: new Date('2026-09-03T00:00:00Z'),
      updatedAt: new Date('2026-09-03T00:00:00Z'),
      remixCount: 0,
      cookCount: 1,
      voteCount: 2,
      resultCount: 0,
    };

    it('should traverse ancestor lineage: C -> B -> A', async () => {
      prisma.experiment.findUnique
        .mockResolvedValueOnce(nodeC)
        .mockResolvedValueOnce(nodeB)
        .mockResolvedValueOnce(nodeA);

      const lineage = await service.getLineage(nodeC.id);

      expect(lineage.experimentId).toBe(nodeC.id);
      expect(lineage.ancestors).toHaveLength(2);
      expect(lineage.ancestors[0]?.id).toBe(nodeB.id);
      expect(lineage.ancestors[1]?.id).toBe(nodeA.id);
      expect(lineage.chain).toHaveLength(3);
      expect(lineage.chain[0]?.id).toBe(nodeC.id);
      expect(lineage.chain[1]?.id).toBe(nodeB.id);
      expect(lineage.chain[2]?.id).toBe(nodeA.id);
    });

    it('should construct living food graph tree structure', async () => {
      prisma.experiment.findUnique.mockResolvedValue(nodeC);
      prisma.experiment.findMany.mockResolvedValue([nodeA, nodeB, nodeC]);

      const treeResult = await service.getTree(nodeC.id);

      expect(treeResult.rootId).toBe(nodeA.id);
      expect(treeResult.targetExperimentId).toBe(nodeC.id);
      expect(treeResult.totalNodes).toBe(3);
      expect(treeResult.tree.id).toBe(nodeA.id);
      expect(treeResult.tree.children).toHaveLength(1);
      expect(treeResult.tree.children[0]?.id).toBe(nodeB.id);
      expect(treeResult.tree.children[0]?.children).toHaveLength(1);
      expect(treeResult.tree.children[0]?.children[0]?.id).toBe(nodeC.id);
    });
  });
});
