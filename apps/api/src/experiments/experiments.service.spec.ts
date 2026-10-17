import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { ExperimentsService } from './experiments.service';
import { PrismaService } from '../database/prisma.service';
import type { CreateExperimentDto } from './dto/create-experiment.dto';
import type { RemixExperimentDto } from './dto/remix-experiment.dto';
import { experimentQuerySchema, userExperimentsQuerySchema } from './dto/experiment-query.dto';

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
        count: jest.fn(),
      },
      experimentIngredient: {
        createMany: jest.fn(),
      },
      ingredient: {
        findMany: jest.fn().mockResolvedValue([]),
      },
      userFollow: {
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

  describe('4. findAll (Living Food Graph Discovery Feed)', () => {
    const mockSampleExperiment = {
      id: 'exp-1111-1111',
      creatorId: mockCreator.id,
      parentId: null,
      rootId: 'exp-1111-1111',
      branchDepth: 0,
      title: 'Spicy Kimchi Toast',
      description: 'Sourdough toast with sautéed kimchi and melted cheddar.',
      steps: [{ stepNumber: 1, instruction: 'Toast sourdough' }],
      difficulty: 'easy',
      estimatedCost: { min: 100, max: 200, currency: 'INR' },
      estimatedTimeMinutes: 10,
      heroMedia: null,
      aiMetadata: null,
      safetyStatus: 'SAFE',
      remixCount: 4,
      cookCount: 12,
      voteCount: 25,
      resultCount: 8,
      createdAt: new Date('2026-10-10T00:00:00Z'),
      updatedAt: new Date('2026-10-10T00:00:00Z'),
      creator: {
        id: mockCreator.id,
        username: mockCreator.username,
        displayName: mockCreator.displayName,
        avatarUrl: mockCreator.avatarUrl,
        skillLevel: mockCreator.skillLevel,
      },
      ingredients: [
        {
          id: 'ing-1',
          canonicalId: '99999999-9999-4999-8999-999999999999',
          name: 'Kimchi',
          quantity: 50,
          unit: 'g',
          preparation: null,
          isOptional: false,
          isCustomAddition: false,
        },
      ],
    };

    it('should query with default safety filter (safetyStatus: { not: "BLOCKED" }), pagination, and trending order', async () => {
      prisma.experiment.findMany.mockResolvedValue([mockSampleExperiment]);
      prisma.experiment.count.mockResolvedValue(1);

      const res = await service.findAll({
        sort: 'trending',
        page: 1,
        limit: 20,
      });

      expect(prisma.experiment.findMany).toHaveBeenCalledWith({
        where: {
          safetyStatus: { not: 'BLOCKED' },
        },
        include: {
          creator: {
            select: {
              id: true,
              username: true,
              displayName: true,
              avatarUrl: true,
              skillLevel: true,
            },
          },
          ingredients: true,
        },
        orderBy: [
          { remixCount: 'desc' },
          { cookCount: 'desc' },
          { voteCount: 'desc' },
          { resultCount: 'desc' },
          { createdAt: 'desc' },
          { id: 'desc' },
        ],
        skip: 0,
        take: 20,
      });

      expect(res.items).toHaveLength(1);
      expect(res.total).toBe(1);
      expect(res.page).toBe(1);
      expect(res.limit).toBe(20);
      expect(res.totalPages).toBe(1);
      expect(res.hasMore).toBe(false);
      expect(res.items[0]?.title).toBe('Spicy Kimchi Toast');
      expect((res.items[0]?.creator as any).passwordHash).toBeUndefined();
      expect((res.items[0]?.creator as any).email).toBeUndefined();
    });

    it('should filter by search term case-insensitively across title and description', async () => {
      prisma.experiment.findMany.mockResolvedValue([]);
      prisma.experiment.count.mockResolvedValue(0);

      await service.findAll({
        search: 'kimchi',
        sort: 'trending',
        page: 1,
        limit: 20,
      });

      expect(prisma.experiment.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: [
              { title: { contains: 'kimchi', mode: 'insensitive' } },
              { description: { contains: 'kimchi', mode: 'insensitive' } },
            ],
          }),
        }),
      );
    });

    it('should filter by difficulty level', async () => {
      prisma.experiment.findMany.mockResolvedValue([]);
      prisma.experiment.count.mockResolvedValue(0);

      await service.findAll({
        difficulty: 'easy',
        sort: 'trending',
        page: 1,
        limit: 20,
      });

      expect(prisma.experiment.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            difficulty: 'easy',
          }),
        }),
      );
    });

    it('should filter by canonical ingredient ID', async () => {
      const canonicalId = '99999999-9999-4999-8999-999999999999';
      prisma.experiment.findMany.mockResolvedValue([]);
      prisma.experiment.count.mockResolvedValue(0);

      await service.findAll({
        canonicalIngredientId: canonicalId,
        sort: 'trending',
        page: 1,
        limit: 20,
      });

      expect(prisma.experiment.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            ingredients: {
              some: {
                canonicalId,
              },
            },
          }),
        }),
      );
    });

    it('should filter by creator ID', async () => {
      const creatorId = mockCreator.id;
      prisma.experiment.findMany.mockResolvedValue([]);
      prisma.experiment.count.mockResolvedValue(0);

      await service.findAll({
        creatorId,
        sort: 'trending',
        page: 1,
        limit: 20,
      });

      expect(prisma.experiment.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            creatorId,
          }),
        }),
      );
    });

    it('should filter by rootOnly=true (parentId is null) and rootOnly=false (parentId is not null)', async () => {
      prisma.experiment.findMany.mockResolvedValue([]);
      prisma.experiment.count.mockResolvedValue(0);

      // Root only
      await service.findAll({
        rootOnly: true,
        sort: 'trending',
        page: 1,
        limit: 20,
      });
      expect(prisma.experiment.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            parentId: null,
          }),
        }),
      );

      // Remixes only
      await service.findAll({
        rootOnly: false,
        sort: 'trending',
        page: 1,
        limit: 20,
      });
      expect(prisma.experiment.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            parentId: { not: null },
          }),
        }),
      );
    });

    it('should apply stable tie-breaker ordering for all sort modes', async () => {
      prisma.experiment.findMany.mockResolvedValue([]);
      prisma.experiment.count.mockResolvedValue(0);

      // recent
      await service.findAll({ sort: 'recent', page: 1, limit: 20 });
      expect(prisma.experiment.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        }),
      );

      // remixes
      await service.findAll({ sort: 'remixes', page: 1, limit: 20 });
      expect(prisma.experiment.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: [{ remixCount: 'desc' }, { createdAt: 'desc' }, { id: 'desc' }],
        }),
      );

      // cooks
      await service.findAll({ sort: 'cooks', page: 1, limit: 20 });
      expect(prisma.experiment.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: [{ cookCount: 'desc' }, { createdAt: 'desc' }, { id: 'desc' }],
        }),
      );

      // votes
      await service.findAll({ sort: 'votes', page: 1, limit: 20 });
      expect(prisma.experiment.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: [{ voteCount: 'desc' }, { createdAt: 'desc' }, { id: 'desc' }],
        }),
      );
    });
  });

  describe('5. findMyExperiments (Authenticated Creator Feed & Isolation)', () => {
    it('should return only experiments authored by authenticated user with pagination', async () => {
      const mockUserExperiment = {
        id: 'exp-user-1',
        creatorId: mockCreator.id,
        parentId: null,
        rootId: 'exp-user-1',
        branchDepth: 0,
        title: 'My Custom Experiment',
        description: 'Personal experiment creation.',
        steps: [],
        difficulty: 'medium',
        estimatedCost: null,
        estimatedTimeMinutes: 15,
        heroMedia: null,
        aiMetadata: null,
        safetyStatus: 'SAFE',
        remixCount: 0,
        cookCount: 0,
        voteCount: 0,
        resultCount: 0,
        createdAt: new Date('2026-10-15T00:00:00Z'),
        updatedAt: new Date('2026-10-15T00:00:00Z'),
        creator: {
          id: mockCreator.id,
          username: mockCreator.username,
          displayName: mockCreator.displayName,
          avatarUrl: mockCreator.avatarUrl,
          skillLevel: mockCreator.skillLevel,
        },
        ingredients: [],
      };

      prisma.experiment.findMany.mockResolvedValue([mockUserExperiment]);
      prisma.experiment.count.mockResolvedValue(1);

      const res = await service.findMyExperiments(mockCreator.id, { page: 1, limit: 10 });

      expect(prisma.experiment.findMany).toHaveBeenCalledWith({
        where: { creatorId: mockCreator.id },
        include: {
          creator: {
            select: {
              id: true,
              username: true,
              displayName: true,
              avatarUrl: true,
              skillLevel: true,
            },
          },
          ingredients: true,
        },
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        skip: 0,
        take: 10,
      });

      expect(res.items).toHaveLength(1);
      expect(res.total).toBe(1);
      expect(res.page).toBe(1);
      expect(res.limit).toBe(10);
      expect(res.totalPages).toBe(1);
      expect(res.hasMore).toBe(false);
      expect(res.items[0]?.id).toBe('exp-user-1');
    });

    it('should correctly paginate subsequent pages for user experiments', async () => {
      prisma.experiment.findMany.mockResolvedValue([]);
      prisma.experiment.count.mockResolvedValue(35);

      const res = await service.findMyExperiments(mockCreator.id, { page: 2, limit: 10 });

      expect(prisma.experiment.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 10,
          take: 10,
        }),
      );
      expect(res.total).toBe(35);
      expect(res.totalPages).toBe(4);
      expect(res.hasMore).toBe(true);
    });
  });

  describe('6. DTO Query Validation Schemas', () => {
    it('should validate and parse experimentQuerySchema defaults', () => {
      const parsed = experimentQuerySchema.safeParse({});
      expect(parsed.success).toBe(true);
      if (parsed.success) {
        expect(parsed.data.page).toBe(1);
        expect(parsed.data.limit).toBe(20);
        expect(parsed.data.sort).toBe('trending');
      }
    });

    it('should coerce strings and parse valid query parameters', () => {
      const parsed = experimentQuerySchema.safeParse({
        search: '  ramen noodles  ',
        difficulty: 'medium',
        canonicalIngredientId: '11111111-1111-4111-8111-111111111111',
        creatorId: '22222222-2222-4222-8222-222222222222',
        rootOnly: 'true',
        sort: 'votes',
        page: '3',
        limit: '15',
      });

      expect(parsed.success).toBe(true);
      if (parsed.success) {
        expect(parsed.data.search).toBe('ramen noodles');
        expect(parsed.data.difficulty).toBe('medium');
        expect(parsed.data.rootOnly).toBe(true);
        expect(parsed.data.sort).toBe('votes');
        expect(parsed.data.page).toBe(3);
        expect(parsed.data.limit).toBe(15);
      }
    });

    it('should reject invalid query values', () => {
      expect(experimentQuerySchema.safeParse({ difficulty: 'impossible' }).success).toBe(false);
      expect(experimentQuerySchema.safeParse({ sort: 'unsupported' }).success).toBe(false);
      expect(experimentQuerySchema.safeParse({ canonicalIngredientId: 'not-a-uuid' }).success).toBe(
        false,
      );
      expect(experimentQuerySchema.safeParse({ creatorId: 'not-a-uuid' }).success).toBe(false);
      expect(experimentQuerySchema.safeParse({ page: 0 }).success).toBe(false);
      expect(experimentQuerySchema.safeParse({ limit: 0 }).success).toBe(false);
      expect(experimentQuerySchema.safeParse({ limit: 101 }).success).toBe(false);
    });

    it('should validate userExperimentsQuerySchema', () => {
      expect(userExperimentsQuerySchema.safeParse({ page: 1, limit: 10 }).success).toBe(true);
      expect(userExperimentsQuerySchema.safeParse({ limit: 101 }).success).toBe(false);
    });
  });

  describe('findFollowingFeed', () => {
    const callerUserId = 'user-caller-1234';

    it('should return empty list when authenticated user follows nobody', async () => {
      prisma.userFollow.findMany.mockResolvedValue([]);

      const result = await service.findFollowingFeed(callerUserId, {
        page: 1,
        limit: 20,
        sort: 'recent',
      });

      expect(prisma.userFollow.findMany).toHaveBeenCalledWith({
        where: { followerId: callerUserId },
        select: { followingId: true },
      });
      expect(prisma.experiment.findMany).not.toHaveBeenCalled();
      expect(result).toEqual({
        items: [],
        total: 0,
        page: 1,
        limit: 20,
        totalPages: 0,
        hasMore: false,
      });
    });

    it('should filter experiments by followed creator IDs and exclude BLOCKED experiments', async () => {
      const followedIds = ['creator-aaa-111', 'creator-bbb-222'];
      prisma.userFollow.findMany.mockResolvedValue([
        { followingId: 'creator-aaa-111' },
        { followingId: 'creator-bbb-222' },
      ]);

      const mockExperiment = {
        id: 'exp-following-1',
        creatorId: 'creator-aaa-111',
        title: 'Followed Chef Butter Chicken',
        description: 'Rich spiced gravy cooked in hostel kettle',
        difficulty: 'medium',
        steps: [],
        estimatedCost: { min: 80, max: 120, currency: 'INR' },
        estimatedTimeMinutes: 25,
        heroMedia: null,
        safetyStatus: 'SAFE',
        parentId: null,
        rootId: 'exp-following-1',
        branchDepth: 0,
        remixCount: 1,
        cookCount: 4,
        voteCount: 10,
        resultCount: 2,
        createdAt: new Date('2026-10-15T00:00:00Z'),
        updatedAt: new Date('2026-10-15T00:00:00Z'),
        creator: {
          id: 'creator-aaa-111',
          username: 'chef_aaa',
          displayName: 'Chef AAA',
          avatarUrl: null,
          skillLevel: 'kettle_pro',
        },
        ingredients: [],
      };

      prisma.experiment.findMany.mockResolvedValue([mockExperiment]);
      prisma.experiment.count.mockResolvedValue(1);

      const result = await service.findFollowingFeed(callerUserId, {
        page: 1,
        limit: 10,
        sort: 'recent',
        difficulty: 'medium',
      });

      expect(prisma.experiment.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            creatorId: { in: followedIds },
            safetyStatus: { not: 'BLOCKED' },
            difficulty: 'medium',
          }),
          skip: 0,
          take: 10,
        }),
      );

      expect(result.items.length).toBe(1);
      expect(result.items[0]!.id).toBe('exp-following-1');
      expect(result.items[0]!.creator?.username).toBe('chef_aaa');
      expect(result.total).toBe(1);
      expect(result.totalPages).toBe(1);
      expect(result.hasMore).toBe(false);
    });

    it('should support search, rootOnly filter, and pagination in following feed', async () => {
      prisma.userFollow.findMany.mockResolvedValue([{ followingId: 'creator-aaa-111' }]);

      prisma.experiment.findMany.mockResolvedValue([]);
      prisma.experiment.count.mockResolvedValue(0);

      await service.findFollowingFeed(callerUserId, {
        page: 2,
        limit: 5,
        search: 'Maggi',
        rootOnly: true,
        sort: 'trending',
      });

      expect(prisma.experiment.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            creatorId: { in: ['creator-aaa-111'] },
            safetyStatus: { not: 'BLOCKED' },
            parentId: null,
            OR: [
              { title: { contains: 'Maggi', mode: 'insensitive' } },
              { description: { contains: 'Maggi', mode: 'insensitive' } },
            ],
          }),
          skip: 5,
          take: 5,
        }),
      );
    });
  });

  describe('Notification dispatching on create and remix', () => {
    it('dispatches notifications to followers when NotificationsService is available on create', async () => {
      const mockNotificationsService = {
        notifyFollowersOfNewExperiment: jest.fn().mockResolvedValue(3),
      };

      const customService = new ExperimentsService(prisma as any, mockNotificationsService as any);

      const mockCreated = {
        id: 'new-exp-123',
        creatorId: 'creator-123',
        parentId: null,
        rootId: 'new-exp-123',
        branchDepth: 0,
        title: 'Notification Test Recipe',
        description: 'Test description',
        difficulty: 'medium',
        safetyStatus: 'SAFE',
        createdAt: new Date(),
        updatedAt: new Date(),
        creator: {
          id: 'creator-123',
          username: 'chef',
          displayName: 'Chef',
          avatarUrl: null,
          skillLevel: 'HOME_COOK',
        },
        ingredients: [],
      };

      prisma.$transaction.mockImplementation(async (callback: any) => {
        return callback({
          experiment: {
            create: jest.fn().mockResolvedValue(mockCreated),
            findUnique: jest.fn().mockResolvedValue(mockCreated),
          },
          experimentIngredient: {
            createMany: jest.fn().mockResolvedValue({ count: 0 }),
          },
        });
      });

      await customService.create('creator-123', {
        title: 'Notification Test Recipe',
        description: 'Test description',
        ingredients: [],
        steps: [{ stepNumber: 1, instruction: 'Cook it.' }],
        difficulty: 'medium',
        estimatedCost: { min: 40, max: 80, currency: 'INR' },
        estimatedTimeMinutes: 15,
      });

      expect(mockNotificationsService.notifyFollowersOfNewExperiment).toHaveBeenCalledWith(
        'creator-123',
        'new-exp-123',
        'Notification Test Recipe',
        false,
      );
    });
  });
});
