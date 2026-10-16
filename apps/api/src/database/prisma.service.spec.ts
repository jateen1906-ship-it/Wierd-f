import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from './prisma.service';

describe('PrismaService', () => {
  let prismaService: PrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PrismaService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              if (key === 'databaseUrl') {
                return 'postgresql://wierd_user:wierd_password@127.0.0.1:5432/wierd_db?schema=public';
              }
              return undefined;
            }),
          },
        },
      ],
    }).compile();

    prismaService = module.get<PrismaService>(PrismaService);
  });

  afterEach(async () => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(prismaService).toBeDefined();
  });

  it('should throw an error during onModuleInit if databaseUrl is missing', async () => {
    const invalidModule: TestingModule = await Test.createTestingModule({
      providers: [
        PrismaService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockReturnValue(undefined),
          },
        },
      ],
    }).compile();

    const serviceWithNoDbUrl = invalidModule.get<PrismaService>(PrismaService);

    await expect(serviceWithNoDbUrl.onModuleInit()).rejects.toThrow(
      'DATABASE_URL configuration is required to initialize Prisma database service.',
    );
  });

  it('should connect to database and disconnect cleanly', async () => {
    const connectSpy = jest.spyOn(prismaService, '$connect').mockResolvedValueOnce();
    const disconnectSpy = jest.spyOn(prismaService, '$disconnect').mockResolvedValueOnce();

    await prismaService.onModuleInit();
    expect(connectSpy).toHaveBeenCalledTimes(1);

    await prismaService.onModuleDestroy();
    expect(disconnectSpy).toHaveBeenCalledTimes(1);
  });
});
