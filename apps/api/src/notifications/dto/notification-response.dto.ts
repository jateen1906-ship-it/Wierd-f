export interface SafeNotificationActor {
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  skillLevel: string;
}

export interface SafeNotificationExperiment {
  id: string;
  title: string;
  difficulty: string;
}

export interface NotificationItem {
  id: string;
  type: string;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
  actor: SafeNotificationActor;
  experiment: SafeNotificationExperiment;
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
