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

export interface AuthResponse {
  accessToken: string;
  user: SafeUser;
}

export interface AuthenticatedUser {
  userId: string;
  username: string;
}
