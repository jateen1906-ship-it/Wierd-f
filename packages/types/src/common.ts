/**
 * Unique identifier representation (UUID v4 string)
 */
export type EntityId = string;

/**
 * ISO 8601 UTC timestamp string
 */
export type IsoTimestamp = string;

/**
 * Standard timestamp tracking for entities
 */
export interface Timestamped {
  readonly createdAt: IsoTimestamp;
  readonly updatedAt?: IsoTimestamp;
}

/**
 * Difficulty ratings for experiments and preparations
 */
export type DifficultyLevel = 'easy' | 'medium' | 'hard' | 'chaos';

/**
 * Supported currency codes for cost estimations (default INR)
 */
export type CurrencyCode = 'INR' | 'USD' | 'EUR' | 'GBP';

/**
 * Estimated financial cost range with uncertainty
 */
export interface CostEstimate {
  readonly min: number;
  readonly max: number;
  readonly currency: CurrencyCode;
}

/**
 * Media reference representing uploaded photos and videos
 */
export interface MediaReference {
  readonly id: EntityId;
  readonly url: string;
  readonly type: 'image' | 'video';
  readonly thumbnailUrl?: string;
  readonly width?: number;
  readonly height?: number;
  readonly durationSeconds?: number;
}

/**
 * Cursor-based pagination query parameters
 */
export interface PaginationParams {
  readonly cursor?: string;
  readonly limit?: number;
}

/**
 * Standard paginated response envelope
 */
export interface PaginatedResult<T> {
  readonly items: readonly T[];
  readonly nextCursor: string | null;
  readonly hasMore: boolean;
  readonly totalCount?: number;
}

/**
 * Generic API response envelope
 */
export interface ApiResponse<T> {
  readonly success: boolean;
  readonly data: T;
  readonly message?: string;
}
