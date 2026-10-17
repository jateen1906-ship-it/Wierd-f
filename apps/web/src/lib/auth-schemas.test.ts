import { loginFormSchema, registerFormSchema } from './auth-schemas';

describe('Auth Validation Schemas', () => {
  describe('loginFormSchema', () => {
    it('should validate valid email and password credentials', () => {
      const res = loginFormSchema.safeParse({
        email: 'chef@hostel.edu',
        password: 'Password123!',
      });
      expect(res.success).toBe(true);
      if (res.success) {
        expect(res.data.email).toBe('chef@hostel.edu');
        expect(res.data.password).toBe('Password123!');
      }
    });

    it('should reject empty email or missing password', () => {
      expect(loginFormSchema.safeParse({ email: '', password: 'pwd' }).success).toBe(false);
      expect(loginFormSchema.safeParse({ email: 'valid@edu.in', password: '' }).success).toBe(
        false,
      );
    });

    it('should reject malformed email format', () => {
      const res = loginFormSchema.safeParse({
        email: 'not-an-email-address',
        password: 'Password123!',
      });
      expect(res.success).toBe(false);
      if (!res.success) {
        expect(res.error.issues[0]?.message).toMatch(/Invalid email/i);
      }
    });
  });

  describe('registerFormSchema', () => {
    it('should accept compliant registration payloads', () => {
      const res = registerFormSchema.safeParse({
        username: 'kettle_master_01',
        displayName: 'Master of Kettles',
        email: 'kettle@hostel.edu',
        password: 'SuperSecretPassword123',
        confirmPassword: 'SuperSecretPassword123',
      });
      expect(res.success).toBe(true);
    });

    it('should reject passwords shorter than 8 characters', () => {
      const res = registerFormSchema.safeParse({
        username: 'validuser',
        email: 'test@hostel.edu',
        password: 'short',
        confirmPassword: 'short',
      });
      expect(res.success).toBe(false);
      if (!res.success) {
        const passIssue = res.error.issues.find((i) => i.path.includes('password'));
        expect(passIssue?.message).toMatch(/at least 8 characters/i);
      }
    });

    it('should reject mismatched passwords', () => {
      const res = registerFormSchema.safeParse({
        username: 'validuser',
        email: 'test@hostel.edu',
        password: 'Password123!',
        confirmPassword: 'DifferentPassword456!',
      });
      expect(res.success).toBe(false);
      if (!res.success) {
        const confirmIssue = res.error.issues.find((i) => i.path.includes('confirmPassword'));
        expect(confirmIssue?.message).toMatch(/passwords do not match/i);
      }
    });

    it('should reject invalid username characters (e.g. spaces or symbols)', () => {
      const res = registerFormSchema.safeParse({
        username: 'invalid user name!',
        email: 'test@hostel.edu',
        password: 'Password123!',
        confirmPassword: 'Password123!',
      });
      expect(res.success).toBe(false);
      if (!res.success) {
        const userIssue = res.error.issues.find((i) => i.path.includes('username'));
        expect(userIssue?.message).toMatch(/alphanumeric/i);
      }
    });

    it('should reject usernames shorter than 3 characters', () => {
      const res = registerFormSchema.safeParse({
        username: 'ab',
        email: 'test@hostel.edu',
        password: 'Password123!',
        confirmPassword: 'Password123!',
      });
      expect(res.success).toBe(false);
      if (!res.success) {
        const userIssue = res.error.issues.find((i) => i.path.includes('username'));
        expect(userIssue?.message).toMatch(/at least 3 characters/i);
      }
    });
  });
});
