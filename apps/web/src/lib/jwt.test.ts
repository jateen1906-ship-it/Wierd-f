import { parseJwt, isTokenExpired } from './jwt';

describe('JWT Safe Parsing & Expiration Helper', () => {
  // Helper to generate test base64url tokens
  const createMockToken = (payload: object) => {
    const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
    const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
    const sig = 'mock_signature_bytes';
    return `${header}.${body}.${sig}`;
  };

  it('should parse valid JWT claims correctly', () => {
    const mockToken = createMockToken({
      sub: 'usr-123-uuid',
      username: 'maggi_scientist',
      exp: 1800000000,
    });

    const parsed = parseJwt(mockToken);
    expect(parsed).not.toBeNull();
    expect(parsed?.sub).toBe('usr-123-uuid');
    expect(parsed?.username).toBe('maggi_scientist');
    expect(parsed?.exp).toBe(1800000000);
  });

  it('should return null for malformed tokens', () => {
    expect(parseJwt('')).toBeNull();
    expect(parseJwt('not.a.valid.jwt.with.too.many.dots')).toBeNull();
    expect(parseJwt('singleparttoken')).toBeNull();
    expect(parseJwt('invalidBase64.!!!.sig')).toBeNull();
  });

  it('should correctly identify expired tokens', () => {
    const expiredTimestamp = Math.floor(Date.now() / 1000) - 3600; // 1 hour ago
    const expiredToken = createMockToken({
      sub: 'usr-123',
      username: 'chef',
      exp: expiredTimestamp,
    });

    expect(isTokenExpired(expiredToken)).toBe(true);
  });

  it('should correctly identify non-expired active tokens', () => {
    const futureTimestamp = Math.floor(Date.now() / 1000) + 3600; // 1 hour in future
    const activeToken = createMockToken({
      sub: 'usr-123',
      username: 'chef',
      exp: futureTimestamp,
    });

    expect(isTokenExpired(activeToken)).toBe(false);
  });

  it('should treat tokens without exp claim as expired/untrusted', () => {
    const tokenNoExp = createMockToken({
      sub: 'usr-123',
      username: 'chef',
    });

    expect(isTokenExpired(tokenNoExp)).toBe(true);
  });
});
