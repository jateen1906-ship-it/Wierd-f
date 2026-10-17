/**
 * Client-safe Environment Configuration
 * Only NEXT_PUBLIC_* variables are permitted in browser-rendered code.
 * Strictly guarantees no server secrets or backend database URLs are exposed.
 */

export const env = {
  apiUrl: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1',
  healthUrl: process.env.NEXT_PUBLIC_HEALTH_URL || 'http://localhost:4000/health',
  isDev: process.env.NODE_ENV !== 'production',
} as const;

export function getApiBaseUrl(): string {
  // Strip trailing slash if present
  return env.apiUrl.replace(/\/+$/, '');
}

export function getHealthUrl(): string {
  return env.healthUrl.replace(/\/+$/, '');
}
