/**
 * Publicly safe creator statistics representation
 */
export interface PublicCreatorStats {
  experimentsCount: number;
  cookingResultsCount: number;
  remixesCount: number;
  followersCount: number;
  followingCount: number;
}

/**
 * Publicly safe creator profile response DTO.
 * Strictly guarantees that sensitive user fields (email, passwordHash,
 * private preferences, personal vote and reaction histories) are NEVER exposed.
 */
export interface PublicUserProfileResponse {
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  bio: string | null;
  skillLevel: string;
  createdAt: string;
  stats: PublicCreatorStats;
  isFollowing?: boolean;
}

/**
 * Result of follow or unfollow action
 */
export interface FollowActionResult {
  success: boolean;
  isFollowing: boolean;
  message?: string;
  followersCount: number;
}

/**
 * Minimal creator item for following lists
 */
export interface FollowedCreatorItem {
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  skillLevel: string;
  bio: string | null;
  followedAt: string;
}

/**
 * Paginated response for following list
 */
export interface PaginatedFollowingResponse {
  items: FollowedCreatorItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasMore: boolean;
}
