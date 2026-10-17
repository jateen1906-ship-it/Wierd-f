/**
 * Safe client-side JWT helper
 * Parses token payload to inspect exp timestamp without secrets or signature manipulation.
 */

export interface JwtPayload {
  sub: string;
  username: string;
  iat?: number;
  exp?: number;
}

/**
 * Decodes base64url-encoded JWT payload safely in browser/node environments.
 */
export function parseJwt(token: string): JwtPayload | null {
  try {
    if (!token || typeof token !== 'string') return null;
    const parts = token.split('.');
    if (parts.length !== 3) return null;

    const base64Url = parts[1];
    if (!base64Url) return null;

    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=');

    // Safe base64 decoding supporting UTF-8
    let jsonString: string;
    if (typeof window !== 'undefined' && typeof window.atob === 'function') {
      const binaryString = window.atob(padded);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      jsonString = new TextDecoder().decode(bytes);
    } else {
      // Node.js fallback for testing environments
      jsonString = Buffer.from(padded, 'base64').toString('utf-8');
    }

    const payload = JSON.parse(jsonString);
    if (!payload || typeof payload !== 'object') return null;
    return payload as JwtPayload;
  } catch {
    return null;
  }
}

/**
 * Checks whether a JWT token has expired based on its standard exp claim.
 * Includes a 10-second skew tolerance to prevent edge-case race conditions.
 */
export function isTokenExpired(token: string, skewSeconds = 10): boolean {
  const payload = parseJwt(token);
  if (!payload || typeof payload.exp !== 'number') {
    return true;
  }
  const nowInSeconds = Math.floor(Date.now() / 1000);
  return nowInSeconds >= payload.exp - skewSeconds;
}
