import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { UsersService } from './users.service';
import { PrismaService } from '../database/prisma.service';

describe('UsersService - Public Creator Profiles & Follow System', () => {
  let service: UsersService;
  let prisma: any;

  const mockUser = {
    id: 'user-uuid-1234',
    username: 'kettle_master',
    displayName: 'Kettle Master',
    email: 'kettle@hostel.edu', // Sensitive!
    passwordHash: 'secret_hash_not_for_public', // Sensitive!
    bio: 'Late night hostel culinary pioneer.',
    avatarUrl: 'https://example.com/avatar.jpg',
    skillLevel: 'kettle_warrior',
    createdAt: new Date('2026-09-15T00:00:00Z'),
  };

  beforeEach(async () => {
    prisma = {
      user: {
        findFirst: jest.fn(),
      },
      experiment: {
        count: jest.fn(),
      },
      cookingResult: {
        count: jest.fn(),
      },
      userFollow: {
        count: jest.fn(),
        findUnique: jest.fn(),
        upsert: jest.fn(),
        deleteMany: jest.fn(),
        findMany: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: PrismaService,
          useValue: prisma,
        },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
  });

  describe('getPublicProfile', () => {
    it('should return sanitized creator profile with contribution and follower stats', async () => {
      prisma.user.findFirst.mockResolvedValue({
        id: mockUser.id,
        username: mockUser.username,
        displayName: mockUser.displayName,
        avatarUrl: mockUser.avatarUrl,
        bio: mockUser.bio,
        skillLevel: mockUser.skillLevel,
        createdAt: mockUser.createdAt,
      });

      // Total experiments = 4, Cooking results = 7, Remixes = 2
      prisma.experiment.count
        .mockResolvedValueOnce(4) // total experiments
        .mockResolvedValueOnce(2); // remixes
      prisma.cookingResult.count.mockResolvedValueOnce(7); // cooking results
      prisma.userFollow.count
        .mockResolvedValueOnce(15) // followersCount
        .mockResolvedValueOnce(3); // followingCount

      prisma.userFollow.findUnique.mockResolvedValue({
        id: 'f-1',
        followerId: 'viewer-uuid-999',
        followingId: mockUser.id,
      });

      const profile = await service.getPublicProfile('kettle_master', 'viewer-uuid-999');

      expect(prisma.user.findFirst).toHaveBeenCalledWith({
        where: {
          username: {
            equals: 'kettle_master',
            mode: 'insensitive',
          },
        },
        select: expect.objectContaining({
          id: true,
          username: true,
          displayName: true,
          avatarUrl: true,
          bio: true,
          skillLevel: true,
          createdAt: true,
        }),
      });

      // Privacy checks
      expect(profile.id).toBe('user-uuid-1234');
      expect(profile.username).toBe('kettle_master');
      expect(profile.displayName).toBe('Kettle Master');
      expect((profile as any).email).toBeUndefined();
      expect((profile as any).passwordHash).toBeUndefined();
      expect((profile as any).preferences).toBeUndefined();

      // Stats
      expect(profile.stats).toEqual({
        experimentsCount: 4,
        cookingResultsCount: 7,
        remixesCount: 2,
        followersCount: 15,
        followingCount: 3,
      });
      expect(profile.isFollowing).toBe(true);
    });

    it('should throw NotFoundException if username does not exist', async () => {
      prisma.user.findFirst.mockResolvedValue(null);

      await expect(service.getPublicProfile('nonexistent_user')).rejects.toThrow(NotFoundException);
    });

    it('should return isFollowing false if the viewer is viewing their own profile', async () => {
      prisma.user.findFirst.mockResolvedValue({
        id: mockUser.id,
        username: mockUser.username,
        displayName: mockUser.displayName,
        avatarUrl: null,
        bio: null,
        skillLevel: 'beginner',
        createdAt: mockUser.createdAt,
      });

      prisma.experiment.count.mockResolvedValue(0);
      prisma.cookingResult.count.mockResolvedValue(0);
      prisma.userFollow.count.mockResolvedValue(0);

      const profile = await service.getPublicProfile('kettle_master', mockUser.id);
      expect(profile.isFollowing).toBe(false);
      expect(prisma.userFollow.findUnique).not.toHaveBeenCalled();
    });
  });

  describe('followUser', () => {
    it('should allow following a creator and return updated followersCount', async () => {
      prisma.user.findFirst.mockResolvedValue({
        id: 'creator-uuid-555',
        username: 'street_foodie',
      });
      prisma.userFollow.upsert.mockResolvedValue({});
      prisma.userFollow.count.mockResolvedValue(10);

      const result = await service.followUser('viewer-uuid-111', 'street_foodie');

      expect(prisma.userFollow.upsert).toHaveBeenCalledWith({
        where: {
          unique_user_follow: {
            followerId: 'viewer-uuid-111',
            followingId: 'creator-uuid-555',
          },
        },
        create: {
          followerId: 'viewer-uuid-111',
          followingId: 'creator-uuid-555',
        },
        update: {},
      });
      expect(result).toEqual({
        success: true,
        isFollowing: true,
        followersCount: 10,
      });
    });

    it('should throw BadRequestException if user attempts to follow themselves', async () => {
      prisma.user.findFirst.mockResolvedValue({
        id: 'same-user-id',
        username: 'self_cook',
      });

      await expect(service.followUser('same-user-id', 'self_cook')).rejects.toThrow(
        BadRequestException,
      );
      expect(prisma.userFollow.upsert).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException if target creator does not exist', async () => {
      prisma.user.findFirst.mockResolvedValue(null);

      await expect(service.followUser('viewer-1', 'unknown_user')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('unfollowUser', () => {
    it('should allow unfollowing a creator and return updated followersCount', async () => {
      prisma.user.findFirst.mockResolvedValue({
        id: 'creator-uuid-555',
        username: 'street_foodie',
      });
      prisma.userFollow.deleteMany.mockResolvedValue({ count: 1 });
      prisma.userFollow.count.mockResolvedValue(9);

      const result = await service.unfollowUser('viewer-uuid-111', 'street_foodie');

      expect(prisma.userFollow.deleteMany).toHaveBeenCalledWith({
        where: {
          followerId: 'viewer-uuid-111',
          followingId: 'creator-uuid-555',
        },
      });
      expect(result).toEqual({
        success: true,
        isFollowing: false,
        followersCount: 9,
      });
    });

    it('should throw BadRequestException if user attempts to unfollow themselves', async () => {
      prisma.user.findFirst.mockResolvedValue({
        id: 'same-user-id',
        username: 'self_cook',
      });

      await expect(service.unfollowUser('same-user-id', 'self_cook')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('getFollowingList', () => {
    it('should return paginated list of followed creators', async () => {
      const mockFollows = [
        {
          id: 'follow-1',
          createdAt: new Date('2026-10-01T00:00:00Z'),
          following: {
            id: 'c-1',
            username: 'chef_one',
            displayName: 'Chef One',
            avatarUrl: null,
            skillLevel: 'kettle_pro',
            bio: 'Master of ramen',
          },
        },
      ];

      prisma.userFollow.findMany.mockResolvedValue(mockFollows);
      prisma.userFollow.count.mockResolvedValue(1);

      const res = await service.getFollowingList('viewer-uuid', 1, 20);

      expect(res.items.length).toBe(1);
      expect(res.items[0]!.username).toBe('chef_one');
      expect(res.total).toBe(1);
      expect(res.page).toBe(1);
      expect(res.totalPages).toBe(1);
      expect(res.hasMore).toBe(false);
    });
  });
});
