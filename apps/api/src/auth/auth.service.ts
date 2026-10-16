import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../database/prisma.service';
import type { User, UserPreference } from '@prisma/client';
import type { RegisterDto } from './dto/register.dto';
import type { LoginDto } from './dto/login.dto';
import type { AuthResponse, SafeUser } from './dto/auth-response.dto';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private static readonly BCRYPT_SALT_ROUNDS = 12;

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  /**
   * Register a new user account with secure password hashing and default preferences.
   */
  async register(dto: RegisterDto): Promise<AuthResponse> {
    const normalizedEmail = dto.email.toLowerCase().trim();
    const normalizedUsername = dto.username.trim();
    const displayName = dto.displayName?.trim() || normalizedUsername;

    // 1. Check for existing email or username conflicts
    const existingUser = await this.prisma.user.findFirst({
      where: {
        OR: [{ email: normalizedEmail }, { username: normalizedUsername }],
      },
    });

    if (existingUser) {
      if (existingUser.email?.toLowerCase() === normalizedEmail) {
        throw new ConflictException('An account with this email address already exists');
      }
      if (existingUser.username.toLowerCase() === normalizedUsername.toLowerCase()) {
        throw new ConflictException('An account with this username already exists');
      }
    }

    // 2. Hash password securely
    const passwordHash = await bcrypt.hash(dto.password, AuthService.BCRYPT_SALT_ROUNDS);

    // 3. Create user and user preference in an atomic transaction
    const createdUser = await this.prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          username: normalizedUsername,
          email: normalizedEmail,
          displayName,
          passwordHash,
          skillLevel: 'beginner',
        },
      });

      await tx.userPreference.create({
        data: {
          userId: user.id,
          dietaryRestrictions: [],
          spiceTolerance: 'medium',
          preferredCuisines: [],
          dislikedIngredients: [],
          availableEquipment: [],
          budgetPreference: 'moderate',
        },
      });

      return user;
    });

    this.logger.log(`User successfully registered with ID: ${createdUser.id}`);

    // 4. Generate JWT access token
    const accessToken = this.generateToken(createdUser.id, createdUser.username);

    return {
      accessToken,
      user: this.toSafeUser(createdUser),
    };
  }

  /**
   * Authenticate a user by email and password and issue a JWT token.
   */
  async login(dto: LoginDto): Promise<AuthResponse> {
    const normalizedEmail = dto.email.toLowerCase().trim();

    const user = await this.prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    // Generic error response to prevent user enumeration
    if (!user || !user.passwordHash) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const isPasswordValid = await bcrypt.compare(dto.password, user.passwordHash);

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid email or password');
    }

    this.logger.log(`User logged in successfully with ID: ${user.id}`);

    const accessToken = this.generateToken(user.id, user.username);

    return {
      accessToken,
      user: this.toSafeUser(user),
    };
  }

  /**
   * Retrieve the safe profile information for the authenticated user.
   */
  async getMe(userId: string): Promise<SafeUser & { preferences: UserPreference | null }> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { preferences: true },
    });

    if (!user) {
      throw new NotFoundException('User profile not found');
    }

    return {
      ...this.toSafeUser(user),
      preferences: user.preferences,
    };
  }

  /**
   * Helper to sign a JWT access token with minimal payload.
   */
  private generateToken(userId: string, username: string): string {
    const payload = {
      sub: userId,
      username,
    };
    return this.jwtService.sign(payload);
  }

  /**
   * Helper to strip out internal and sensitive fields like passwordHash.
   */
  private toSafeUser(user: User): SafeUser {
    return {
      id: user.id,
      username: user.username,
      displayName: user.displayName,
      email: user.email,
      bio: user.bio,
      avatarUrl: user.avatarUrl,
      skillLevel: user.skillLevel,
      createdAt: user.createdAt.toISOString(),
    };
  }
}
