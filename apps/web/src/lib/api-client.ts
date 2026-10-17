import { getApiBaseUrl, getHealthUrl } from './config';
import type { DifficultyLevel, Experiment, CanonicalIngredient } from '@food-evolution/types';

export class ApiError extends Error {
  constructor(
    public readonly statusCode: number,
    message: string,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    total: number;
    limit: number;
    cursor?: string | null;
    hasMore: boolean;
  };
}

export type ExperimentSortMode = 'trending' | 'recent' | 'remixes' | 'cooks' | 'votes';

export interface ExperimentQueryOptions {
  limit?: number;
  page?: number;
  cursor?: string;
  sort?: ExperimentSortMode;
  difficulty?: DifficultyLevel;
  search?: string;
  rootOnly?: boolean;
  canonicalIngredientId?: string;
  creatorId?: string;
  creatorUsername?: string;
}

export interface PaginatedExperimentsResponse {
  items: ExperimentWithDetails[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasMore: boolean;
  data?: ExperimentWithDetails[];
}

export interface HealthResponse {
  status: 'ok' | 'degraded' | 'error';
  timestamp: string;
  uptime?: number;
}

export interface SafeUser {
  id: string;
  username: string;
  displayName: string;
  email: string | null;
  bio: string | null;
  avatarUrl: string | null;
  skillLevel: string;
  createdAt: string;
}

export interface SafeCreator {
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  skillLevel: string;
  email?: string | null;
  bio?: string | null;
  createdAt?: string;
}

export interface ExperimentWithDetails extends Experiment {
  creator?: SafeCreator;
}

export type ExperimentResponse = ExperimentWithDetails;

export interface UserPreference {
  id?: string;
  userId?: string;
  dietaryRestrictions: string[];
  spiceTolerance: string;
  preferredCuisines: string[];
  dislikedIngredients: string[];
  availableEquipment: string[];
  budgetPreference: string;
}

export interface PublicCreatorStats {
  experimentsCount: number;
  cookingResultsCount: number;
  remixesCount: number;
  followersCount: number;
  followingCount: number;
}

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

export interface FollowActionResult {
  success: boolean;
  isFollowing: boolean;
  message?: string;
  followersCount: number;
}

export interface FollowedCreatorItem {
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  skillLevel: string;
  bio: string | null;
  followedAt: string;
}

export interface PaginatedFollowingResponse {
  items: FollowedCreatorItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasMore: boolean;
}

export interface NotificationActor {
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  skillLevel: string;
}

export interface NotificationExperiment {
  id: string;
  title: string;
  difficulty?: string;
}

export interface NotificationItem {
  id: string;
  type: string;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
  actor: NotificationActor;
  experiment: NotificationExperiment;
}

export interface PaginatedNotificationsResponse {
  items: NotificationItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasMore: boolean;
}

export interface UnreadCountResponse {
  unreadCount: number;
}

export type ActivityEventType = 'root_experiment' | 'remix' | 'cooking_result';

export interface ActivityActor {
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  skillLevel: string;
}

export interface ActivityTargetExperiment {
  id: string;
  title: string;
  difficulty?: string;
  heroMedia?: any;
  parentId?: string | null;
  parentTitle?: string | null;
  branchDepth?: number;
}

export interface ActivityTargetCookingResult {
  id: string;
  outcomeTag: string;
  tasteRating: number;
  textureRating?: number | null;
  wouldMakeAgain: boolean;
  caption: string | null;
  media: any;
}

export interface ActivityItem {
  id: string;
  type: ActivityEventType;
  createdAt: string;
  title: string;
  message: string;
  actor: ActivityActor;
  experiment: ActivityTargetExperiment;
  cookingResult?: ActivityTargetCookingResult | null;
}

export interface PaginatedActivityResponse {
  items: ActivityItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasMore: boolean;
}

export interface ActivityQueryOptions {
  page?: number;
  limit?: number;
  type?: 'all' | 'root_experiment' | 'remix' | 'cooking_result';
}

export interface UserProfileResponse extends SafeUser {
  preferences: UserPreference | null;
}

export interface AuthResponse {
  accessToken: string;
  user: SafeUser;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  username: string;
  email: string;
  password: string;
  displayName?: string;
}

export interface CreateExperimentIngredientInput {
  id?: string;
  name: string;
  quantity: number;
  unit: string;
  preparation?: string;
  canonicalId?: string;
  isOptional?: boolean;
  isCustomAddition?: boolean;
}

export interface PreparationStepInput {
  stepNumber: number;
  instruction: string;
  durationMinutes?: number;
  temperatureCelsius?: number;
  safetyTip?: string;
  isCritical?: boolean;
}

export interface CostEstimateInput {
  min: number;
  max: number;
  currency: string;
}

export interface CreateExperimentInput {
  title: string;
  description: string;
  ingredients: CreateExperimentIngredientInput[];
  steps: PreparationStepInput[];
  difficulty: DifficultyLevel;
  estimatedCost: CostEstimateInput;
  estimatedTimeMinutes: number;
  heroMedia?: {
    id?: string;
    url: string;
    type: 'image' | 'video';
  };
}

export type TransformationType =
  | 'ingredient_added'
  | 'ingredient_removed'
  | 'ingredient_substituted'
  | 'quantity_changed'
  | 'cooking_method_changed'
  | 'cooking_time_changed'
  | 'spice_level_changed'
  | 'ratio_changed'
  | 'technique_changed'
  | 'constraint_adjusted';

export interface ExperimentTransformationInput {
  type: TransformationType;
  description: string;
  previousValue?: string;
  newValue?: string;
}

export interface RemixExperimentInput {
  title: string;
  description: string;
  transformations: ExperimentTransformationInput[];
  ingredients: CreateExperimentIngredientInput[];
  steps: PreparationStepInput[];
  difficulty?: DifficultyLevel;
  estimatedCost?: CostEstimateInput;
  estimatedTimeMinutes?: number;
  heroMedia?: {
    id?: string;
    url: string;
    type: 'image' | 'video';
  };
}

export interface LineageNode {
  id: string;
  title: string;
  creator: SafeUser;
  parentId: string | null;
  rootId: string | null;
  branchDepth: number;
  createdAt: string;
  remixCount: number;
}

export interface LineageResponse {
  experimentId: string;
  ancestors: LineageNode[];
  chain: LineageNode[];
  chainLength: number;
}

export interface ExperimentTreeNode {
  id: string;
  title: string;
  creator: SafeCreator;
  parentId: string | null;
  rootId: string | null;
  branchDepth: number;
  createdAt: string;
  remixCount: number;
  cookCount: number;
  voteCount: number;
  resultCount: number;
  children: ExperimentTreeNode[];
}

export interface ExperimentTreeResponse {
  rootId: string;
  targetExperimentId: string;
  totalNodes: number;
  tree: ExperimentTreeNode;
  nodes: Omit<ExperimentTreeNode, 'children'>[];
}

export type VoteChoice = 'would_try' | 'pass';

export interface VoteResponse {
  id: string;
  userId: string;
  experimentId: string;
  choice: VoteChoice;
  createdAt: string;
  updatedAt: string;
}

export interface ExperimentVoteSummary {
  experimentId: string;
  wouldTryCount: number;
  passCount: number;
  totalVotes: number;
  userVote?: VoteChoice;
}

export type CookingOutcomeTag =
  | 'perfection'
  | 'unexpectedly_worked'
  | 'burned_it'
  | 'texture_disaster'
  | 'flavor_bomb'
  | 'hostel_survival'
  | 'needs_remix'
  | 'total_chaos';

export type ResultReactionType = 'fire' | 'yuck' | 'respect' | 'laugh' | 'mind_blown';

export interface MediaReference {
  id: string;
  url: string;
  type: 'image' | 'video';
  thumbnailUrl?: string;
  width?: number;
  height?: number;
  durationSeconds?: number;
}

export interface SafeCook {
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  skillLevel: string;
}

export interface CookingResultResponse {
  id: string;
  experimentId: string;
  userId: string;
  user?: SafeCook;
  media: MediaReference[];
  caption: string | null;
  notes: string | null;
  outcomeTag: CookingOutcomeTag;
  tasteRating: number;
  textureRating: number | null;
  wouldMakeAgain: boolean;
  modificationsMade: string | null;
  likesCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface PaginatedCookingResultsResponse {
  items: CookingResultResponse[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasMore: boolean;
}

export interface CreateCookingResultInput {
  experimentId: string;
  media: MediaReference[];
  caption?: string;
  notes?: string;
  outcomeTag: CookingOutcomeTag;
  tasteRating: number;
  textureRating?: number;
  wouldMakeAgain: boolean;
  modificationsMade?: string;
}

export interface CookingResultReactionResponse {
  id: string;
  userId: string;
  resultId: string;
  type: ResultReactionType;
  createdAt: string;
  updatedAt: string;
}

export interface CookingResultReactionSummary {
  resultId: string;
  fireCount: number;
  yuckCount: number;
  respectCount: number;
  laughCount: number;
  mindBlownCount: number;
  totalReactions: number;
  likesCount: number;
  userReaction?: ResultReactionType;
}

export interface UserVoteItem {
  id: string;
  userId: string;
  experimentId: string;
  choice: VoteChoice;
  createdAt: string;
  updatedAt: string;
  experiment?: {
    id: string;
    title: string;
  };
}

export interface PaginatedUserVotesResponse {
  items: UserVoteItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasMore: boolean;
}

export interface UserReactionItem {
  id: string;
  userId: string;
  resultId: string;
  type: ResultReactionType;
  createdAt: string;
  updatedAt: string;
  result?: {
    id: string;
    experimentId: string;
    outcomeTag: CookingOutcomeTag;
    caption?: string | null;
  };
}

export interface PaginatedUserReactionsResponse {
  items: UserReactionItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasMore: boolean;
}

export interface IngredientItem {
  id: string;
  name: string;
  category: string;
  commonSubstitutions: string[];
  isCommonAllergen: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface PaginatedIngredientsResponse {
  items: IngredientItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasMore: boolean;
}

export interface IngredientCategoriesResponse {
  categories: string[];
  total: number;
}

const AUTH_TOKEN_KEY = 'wierd_access_token';

class WierdApiClient {
  private token: string | null = null;
  public onUnauthorized?: () => void;

  constructor() {
    if (typeof window !== 'undefined') {
      try {
        this.token = localStorage.getItem(AUTH_TOKEN_KEY);
      } catch {
        // Storage might be restricted in private/sandbox modes
      }
    }
  }

  setToken(token: string | null): void {
    this.token = token;
    if (typeof window !== 'undefined') {
      try {
        if (token) {
          localStorage.setItem(AUTH_TOKEN_KEY, token);
        } else {
          localStorage.removeItem(AUTH_TOKEN_KEY);
        }
      } catch {
        // Ignore storage exceptions
      }
    }
  }

  getToken(): string | null {
    return this.token;
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const baseUrl = endpoint.startsWith('http') ? '' : getApiBaseUrl();
    const url = endpoint.startsWith('http')
      ? endpoint
      : `${baseUrl}${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...((options.headers as Record<string, string>) || {}),
    };

    if (this.token && !headers.Authorization) {
      headers.Authorization = `Bearer ${this.token}`;
    }

    let response: Response;
    try {
      response = await fetch(url, {
        ...options,
        headers,
      });
    } catch (networkErr: unknown) {
      const msg =
        networkErr instanceof Error ? networkErr.message : 'Network request to backend failed';
      throw new ApiError(0, msg, networkErr);
    }

    if (!response.ok) {
      if (response.status === 401 && headers.Authorization) {
        if (typeof this.onUnauthorized === 'function') {
          this.onUnauthorized();
        }
      }

      let errorMessage = `HTTP ${response.status} ${response.statusText}`;
      let errorBody: unknown = null;
      try {
        errorBody = await response.json();
        if (typeof errorBody === 'object' && errorBody !== null) {
          const bodyObj = errorBody as Record<string, unknown>;
          if (typeof bodyObj.message === 'string') {
            errorMessage = bodyObj.message;
          } else if (Array.isArray(bodyObj.message)) {
            errorMessage = bodyObj.message.join(', ');
          }
        }
      } catch {
        // Fallback to default status
      }
      throw new ApiError(response.status, errorMessage, errorBody);
    }

    if (response.status === 204) {
      return {} as T;
    }

    return response.json();
  }

  // Live Backend Health
  async checkHealth(): Promise<HealthResponse> {
    try {
      return await this.request<HealthResponse>(getHealthUrl());
    } catch {
      return { status: 'error', timestamp: new Date().toISOString() };
    }
  }

  // Experiments
  readonly experiments = {
    list: async (opts: ExperimentQueryOptions = {}): Promise<PaginatedExperimentsResponse> => {
      const params = new URLSearchParams();
      if (opts.limit) params.set('limit', String(opts.limit));
      if (opts.page) params.set('page', String(opts.page));
      if (opts.cursor) params.set('cursor', opts.cursor);
      if (opts.sort) params.set('sort', opts.sort);
      if (opts.difficulty && (opts.difficulty as string) !== 'all') {
        params.set('difficulty', opts.difficulty);
      }
      if (opts.search) params.set('search', opts.search);
      if (opts.canonicalIngredientId) {
        params.set('canonicalIngredientId', opts.canonicalIngredientId);
      }
      if (opts.creatorId) params.set('creatorId', opts.creatorId);
      if (opts.creatorUsername) params.set('creatorUsername', opts.creatorUsername);
      if (typeof opts.rootOnly === 'boolean') params.set('rootOnly', String(opts.rootOnly));

      const queryStr = params.toString();
      const res = await this.request<{
        items?: ExperimentWithDetails[];
        data?: ExperimentWithDetails[];
        total?: number;
        page?: number;
        limit?: number;
        totalPages?: number;
        hasMore?: boolean;
      }>(`/experiments${queryStr ? `?${queryStr}` : ''}`);

      const items: ExperimentWithDetails[] = res.items || res.data || [];
      return {
        items,
        data: items,
        total: res.total ?? items.length,
        page: res.page ?? (opts.page || 1),
        limit: res.limit ?? (opts.limit || 20),
        totalPages: res.totalPages ?? 1,
        hasMore: res.hasMore ?? false,
      };
    },

    followingFeed: async (
      opts: ExperimentQueryOptions = {},
    ): Promise<PaginatedExperimentsResponse> => {
      const params = new URLSearchParams();
      if (opts.limit) params.set('limit', String(opts.limit));
      if (opts.page) params.set('page', String(opts.page));
      if (opts.cursor) params.set('cursor', opts.cursor);
      if (opts.sort) params.set('sort', opts.sort);
      if (opts.difficulty && (opts.difficulty as string) !== 'all') {
        params.set('difficulty', opts.difficulty);
      }
      if (opts.search) params.set('search', opts.search);
      if (opts.canonicalIngredientId) {
        params.set('canonicalIngredientId', opts.canonicalIngredientId);
      }
      if (typeof opts.rootOnly === 'boolean') params.set('rootOnly', String(opts.rootOnly));

      const queryStr = params.toString();
      const res = await this.request<{
        items?: ExperimentWithDetails[];
        data?: ExperimentWithDetails[];
        total?: number;
        page?: number;
        limit?: number;
        totalPages?: number;
        hasMore?: boolean;
      }>(`/experiments/feed/following${queryStr ? `?${queryStr}` : ''}`);

      const items: ExperimentWithDetails[] = res.items || res.data || [];
      return {
        items,
        data: items,
        total: res.total ?? items.length,
        page: res.page ?? (opts.page || 1),
        limit: res.limit ?? (opts.limit || 20),
        totalPages: res.totalPages ?? 1,
        hasMore: res.hasMore ?? false,
      };
    },

    get: async (id: string): Promise<ExperimentWithDetails> => {
      return this.request<ExperimentWithDetails>(`/experiments/${id}`);
    },

    create: async (dto: CreateExperimentInput): Promise<ExperimentWithDetails> => {
      return this.request<ExperimentWithDetails>('/experiments', {
        method: 'POST',
        body: JSON.stringify(dto),
      });
    },

    remix: async (id: string, dto: RemixExperimentInput): Promise<ExperimentWithDetails> => {
      return this.request<ExperimentWithDetails>(`/experiments/${id}/remix`, {
        method: 'POST',
        body: JSON.stringify(dto),
      });
    },

    lineage: async (id: string): Promise<LineageResponse> => {
      return this.request<LineageResponse>(`/experiments/${id}/lineage`);
    },

    tree: async (id: string): Promise<ExperimentTreeResponse> => {
      return this.request<ExperimentTreeResponse>(`/experiments/${id}/tree`);
    },
  };

  // Canonical Ingredients
  readonly ingredients = {
    list: async (query?: string, limit = 20): Promise<PaginatedIngredientsResponse> => {
      const params = new URLSearchParams();
      if (query) params.set('query', query);
      params.set('limit', String(limit));
      return this.request<PaginatedIngredientsResponse>(`/ingredients?${params.toString()}`);
    },

    categories: async (): Promise<IngredientCategoriesResponse> => {
      return this.request<IngredientCategoriesResponse>('/ingredients/categories');
    },
  };

  // Auth Endpoints
  readonly auth = {
    register: async (dto: RegisterRequest): Promise<AuthResponse> => {
      const res = await this.request<AuthResponse>('/auth/register', {
        method: 'POST',
        body: JSON.stringify(dto),
      });
      if (res.accessToken) {
        this.setToken(res.accessToken);
      }
      return res;
    },

    login: async (dto: LoginRequest): Promise<AuthResponse> => {
      const res = await this.request<AuthResponse>('/auth/login', {
        method: 'POST',
        body: JSON.stringify(dto),
      });
      if (res.accessToken) {
        this.setToken(res.accessToken);
      }
      return res;
    },

    me: async (): Promise<UserProfileResponse> => {
      return this.request<UserProfileResponse>('/auth/me');
    },

    logout: (): void => {
      this.setToken(null);
    },
  };

  // Community Votes
  readonly votes = {
    getSummary: async (experimentId: string): Promise<ExperimentVoteSummary> => {
      return this.request<ExperimentVoteSummary>(`/experiments/${experimentId}/votes`);
    },

    cast: async (experimentId: string, choice: VoteChoice): Promise<VoteResponse> => {
      return this.request<VoteResponse>(`/experiments/${experimentId}/votes`, {
        method: 'POST',
        body: JSON.stringify({ choice }),
      });
    },

    remove: async (experimentId: string): Promise<{ success: boolean; message: string }> => {
      return this.request<{ success: boolean; message: string }>(
        `/experiments/${experimentId}/votes`,
        {
          method: 'DELETE',
        },
      );
    },
  };

  // Real-World Cooking Proofs / Results
  readonly cookingResults = {
    create: async (dto: CreateCookingResultInput): Promise<CookingResultResponse> => {
      return this.request<CookingResultResponse>('/cooking-results', {
        method: 'POST',
        body: JSON.stringify(dto),
      });
    },

    get: async (id: string): Promise<CookingResultResponse> => {
      return this.request<CookingResultResponse>(`/cooking-results/${id}`);
    },

    listByExperiment: async (
      experimentId: string,
      page = 1,
      limit = 20,
    ): Promise<PaginatedCookingResultsResponse> => {
      return this.request<PaginatedCookingResultsResponse>(
        `/experiments/${experimentId}/cooking-results?page=${page}&limit=${limit}`,
      );
    },
  };

  // Cooking Result Reactions
  readonly reactions = {
    getSummary: async (resultId: string): Promise<CookingResultReactionSummary> => {
      return this.request<CookingResultReactionSummary>(`/cooking-results/${resultId}/reactions`);
    },

    cast: async (
      resultId: string,
      type: ResultReactionType,
    ): Promise<CookingResultReactionResponse> => {
      return this.request<CookingResultReactionResponse>(`/cooking-results/${resultId}/reactions`, {
        method: 'POST',
        body: JSON.stringify({ type }),
      });
    },

    remove: async (resultId: string): Promise<{ success: boolean; message: string }> => {
      return this.request<{ success: boolean; message: string }>(
        `/cooking-results/${resultId}/reactions`,
        {
          method: 'DELETE',
        },
      );
    },
  };

  // Authenticated User Profile & Activity Endpoints
  readonly users = {
    myExperiments: async (page = 1, limit = 20): Promise<PaginatedExperimentsResponse> => {
      const params = new URLSearchParams({ page: String(page), limit: String(limit) });
      const res = await this.request<any>(`/users/me/experiments?${params.toString()}`);
      const items = res.items || res.data || [];
      return {
        items,
        data: items,
        total: res.total ?? items.length,
        page: res.page ?? page,
        limit: res.limit ?? limit,
        totalPages: res.totalPages ?? 1,
        hasMore: res.hasMore ?? false,
      };
    },

    myCookingResults: async (page = 1, limit = 20): Promise<PaginatedCookingResultsResponse> => {
      const params = new URLSearchParams({ page: String(page), limit: String(limit) });
      return this.request<PaginatedCookingResultsResponse>(
        `/users/me/cooking-results?${params.toString()}`,
      );
    },

    myVotes: async (page = 1, limit = 20): Promise<PaginatedUserVotesResponse> => {
      const params = new URLSearchParams({ page: String(page), limit: String(limit) });
      return this.request<PaginatedUserVotesResponse>(`/users/me/votes?${params.toString()}`);
    },

    myReactions: async (page = 1, limit = 20): Promise<PaginatedUserReactionsResponse> => {
      const params = new URLSearchParams({ page: String(page), limit: String(limit) });
      return this.request<PaginatedUserReactionsResponse>(
        `/users/me/reactions?${params.toString()}`,
      );
    },

    getPublicProfile: async (username: string): Promise<PublicUserProfileResponse> => {
      return this.request<PublicUserProfileResponse>(`/users/${encodeURIComponent(username)}`);
    },

    follow: async (username: string): Promise<FollowActionResult> => {
      return this.request<FollowActionResult>(`/users/${encodeURIComponent(username)}/follow`, {
        method: 'POST',
      });
    },

    unfollow: async (username: string): Promise<FollowActionResult> => {
      return this.request<FollowActionResult>(`/users/${encodeURIComponent(username)}/follow`, {
        method: 'DELETE',
      });
    },

    myFollowing: async (page = 1, limit = 20): Promise<PaginatedFollowingResponse> => {
      const params = new URLSearchParams({ page: String(page), limit: String(limit) });
      return this.request<PaginatedFollowingResponse>(`/users/me/following?${params.toString()}`);
    },
  };

  public readonly notifications = {
    list: async (page = 1, limit = 20): Promise<PaginatedNotificationsResponse> => {
      const params = new URLSearchParams({ page: String(page), limit: String(limit) });
      return this.request<PaginatedNotificationsResponse>(`/notifications?${params.toString()}`);
    },

    unreadCount: async (): Promise<UnreadCountResponse> => {
      return this.request<UnreadCountResponse>('/notifications/unread-count');
    },

    markAsRead: async (id: string): Promise<NotificationItem> => {
      return this.request<NotificationItem>(`/notifications/${encodeURIComponent(id)}/read`, {
        method: 'PATCH',
      });
    },

    markAllAsRead: async (): Promise<{ count: number }> => {
      return this.request<{ count: number }>('/notifications/read-all', {
        method: 'PATCH',
      });
    },
  };

  public readonly activity = {
    feed: async (options?: ActivityQueryOptions): Promise<PaginatedActivityResponse> => {
      const params = new URLSearchParams();
      if (options?.page) params.append('page', String(options.page));
      if (options?.limit) params.append('limit', String(options.limit));
      if (options?.type && options.type !== 'all') params.append('type', options.type);
      const queryStr = params.toString() ? `?${params.toString()}` : '';
      return this.request<PaginatedActivityResponse>(`/activity${queryStr}`);
    },
  };
}

export const apiClient = new WierdApiClient();
