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
