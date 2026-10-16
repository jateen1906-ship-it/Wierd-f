import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { ConflictException, UnauthorizedException, NotFoundException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { AuthService } from './auth.service';
import { PrismaService } from '../database/prisma.service';

describe('AuthService', () => {
  let authService: AuthService;
  let prismaService: jest.Mocked<PrismaService>;
  let jwtService: jest.Mocked<JwtService>;

  const mockUser = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    username: 'testcook',
    displayName: 'Test Cook',
    email: 'test@example.com',
    passwordHash: '$2a$12$e8YQz1R6m7aU9Y2a7eZ2Ce4Vp7D4W1w1q8v8G5K3y2L4M6N8O0P1Q',
    bio: null,
    avatarUrl: null,
    skillLevel: 'beginner',
    createdAt: new Date('2026-09-11T00:00:00.000Z'),
    updatedAt: new Date('2026-09-11T00:00:00.000Z'),
  };

  const mockPreferences = {
    id: '223e4567-e89b-12d3-a456-426614174000',
    userId: mockUser.id,
    dietaryRestrictions: [],
    spiceTolerance: 'medium',
    preferredCuisines: [],
    dislikedIngredients: [],
    availableEquipment: [],
    budgetPreference: 'moderate',
    createdAt: new Date('2026-09-11T00:00:00.000Z'),
    updatedAt: new Date('2026-09-11T00:00:00.000Z'),
  };

  beforeEach(async () => {
    const mockPrisma = {
      user: {
        findFirst: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
      },
      userPreference: {
        create: jest.fn(),
      },
      $transaction: jest.fn((callback) =>
        callback({
          user: {
            create: jest.fn().mockResolvedValue(mockUser),
          },
          userPreference: {
            create: jest.fn().mockResolvedValue(mockPreferences),
          },
        }),
      ),
    };

    const mockJwt = {
      sign: jest.fn().mockReturnValue('mocked.jwt.token'),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: JwtService, useValue: mockJwt },
      ],
    }).compile();

    authService = module.get<AuthService>(AuthService);
    prismaService = module.get(PrismaService);
    jwtService = module.get(JwtService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('register', () => {
    const registerDto = {
      username: 'testcook',
      email: 'test@example.com',
      password: 'StrongPassword123!',
      displayName: 'Test Cook',
    };

    it('should successfully register a user and return token and safe user', async () => {
      (prismaService.user.findFirst as jest.Mock).mockResolvedValue(null);

      const result = await authService.register(registerDto);

      expect(result).toBeDefined();
      expect(result.accessToken).toBe('mocked.jwt.token');
      expect(result.user.id).toBe(mockUser.id);
      expect(result.user.username).toBe(mockUser.username);
      expect(result.user.email).toBe(mockUser.email);
      expect((result.user as unknown as Record<string, unknown>)['passwordHash']).toBeUndefined();
      expect(jwtService.sign).toHaveBeenCalledWith({
        sub: mockUser.id,
        username: mockUser.username,
      });
    });

    it('should throw ConflictException if email is already registered', async () => {
      (prismaService.user.findFirst as jest.Mock).mockResolvedValue({
        ...mockUser,
        email: 'test@example.com',
      });

      await expect(authService.register(registerDto)).rejects.toThrow(ConflictException);
    });

    it('should throw ConflictException if username is already registered', async () => {
      (prismaService.user.findFirst as jest.Mock).mockResolvedValue({
        ...mockUser,
        email: 'other@example.com',
        username: 'testcook',
      });

      await expect(authService.register(registerDto)).rejects.toThrow(ConflictException);
    });
  });

  describe('login', () => {
    const loginDto = {
      email: 'test@example.com',
      password: 'CorrectPassword123!',
    };

    it('should login successfully with valid credentials and return JWT token', async () => {
      const hashedPassword = await bcrypt.hash('CorrectPassword123!', 10);
      (prismaService.user.findUnique as jest.Mock).mockResolvedValue({
        ...mockUser,
        passwordHash: hashedPassword,
      });

      const result = await authService.login(loginDto);

      expect(result).toBeDefined();
      expect(result.accessToken).toBe('mocked.jwt.token');
      expect(result.user.id).toBe(mockUser.id);
      expect((result.user as unknown as Record<string, unknown>)['passwordHash']).toBeUndefined();
    });

    it('should throw UnauthorizedException if user is not found', async () => {
      (prismaService.user.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(authService.login(loginDto)).rejects.toThrow(
        new UnauthorizedException('Invalid email or password'),
      );
    });

    it('should throw UnauthorizedException if password does not match', async () => {
      const hashedPassword = await bcrypt.hash('DifferentPassword!', 10);
      (prismaService.user.findUnique as jest.Mock).mockResolvedValue({
        ...mockUser,
        passwordHash: hashedPassword,
      });

      await expect(authService.login(loginDto)).rejects.toThrow(
        new UnauthorizedException('Invalid email or password'),
      );
    });

    it('should throw UnauthorizedException if user has no passwordHash (OAuth/external)', async () => {
      (prismaService.user.findUnique as jest.Mock).mockResolvedValue({
        ...mockUser,
        passwordHash: null,
      });

      await expect(authService.login(loginDto)).rejects.toThrow(
        new UnauthorizedException('Invalid email or password'),
      );
    });
  });

  describe('getMe', () => {
    it('should return safe user profile with preferences', async () => {
      (prismaService.user.findUnique as jest.Mock).mockResolvedValue({
        ...mockUser,
        preferences: mockPreferences,
      });

      const result = await authService.getMe(mockUser.id);

      expect(result).toBeDefined();
      expect(result.id).toBe(mockUser.id);
      expect(result.username).toBe(mockUser.username);
      expect(result.preferences).toBeDefined();
      expect((result as unknown as Record<string, unknown>)['passwordHash']).toBeUndefined();
    });

    it('should throw NotFoundException if user is not found', async () => {
      (prismaService.user.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(authService.getMe('non-existent-id')).rejects.toThrow(NotFoundException);
    });
  });
});
