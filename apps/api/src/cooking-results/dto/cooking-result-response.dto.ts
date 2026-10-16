import type { CookingResult, User } from '@prisma/client';

/**
 * Publicly safe cook/creator profile representation (never leaks passwordHash, email, or secrets)
 */
export interface SafeCook {
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  skillLevel: string;
}

/**
 * Publicly safe cooking result response representation
 */
export interface CookingResultResponse {
  id: string;
  experimentId: string;
  userId: string;
  user?: SafeCook;
  media: unknown[];
  caption: string | null;
  notes: string | null;
  outcomeTag: string;
  tasteRating: number;
  textureRating: number | null;
  wouldMakeAgain: boolean;
  modificationsMade: string | null;
  likesCount: number;
  createdAt: string;
  updatedAt: string;
}

/**
 * Standard paginated response envelope for cooking results
 */
export interface PaginatedCookingResultsResponse {
  items: CookingResultResponse[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasMore: boolean;
}

/**
 * Maps raw User entity to sanitized SafeCook
 */
export function toSafeCook(
  user: Pick<User, 'id' | 'username' | 'displayName' | 'avatarUrl' | 'skillLevel'>,
): SafeCook {
  return {
    id: user.id,
    username: user.username,
    displayName: user.displayName,
    avatarUrl: user.avatarUrl,
    skillLevel: user.skillLevel,
  };
}

/**
 * Maps database CookingResult model to sanitized response DTO
 */
export function toCookingResultResponse(
  result: CookingResult & {
    user?: Pick<User, 'id' | 'username' | 'displayName' | 'avatarUrl' | 'skillLevel'> | null;
  },
): CookingResultResponse {
  return {
    id: result.id,
    experimentId: result.experimentId,
    userId: result.userId,
    user: result.user ? toSafeCook(result.user) : undefined,
    media: (result.media as any) ?? [],
    caption: result.caption,
    notes: result.notes,
    outcomeTag: result.outcomeTag,
    tasteRating: result.tasteRating,
    textureRating: result.textureRating,
    wouldMakeAgain: result.wouldMakeAgain,
    modificationsMade: result.modificationsMade,
    likesCount: result.likesCount,
    createdAt: result.createdAt.toISOString(),
    updatedAt: result.updatedAt.toISOString(),
  };
}
