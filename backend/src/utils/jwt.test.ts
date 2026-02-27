import * as fc from 'fast-check';
import * as jwt from 'jsonwebtoken';
import { generateToken, verifyToken, TokenPayload } from './jwt';

/**
 * Property-Based Tests for JWT Token Expiration
 * Feature: socialhive-platform, Property 42: Authentication Token Expiration
 * Validates: Requirements 19.3
 */

describe('JWT Token Expiration - Property-Based Tests', () => {
  const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key';

  /**
   * Property 42: Authentication Token Expiration
   * For any authentication token issued, it should expire after a defined time period,
   * and expired tokens should be rejected for authenticated requests.
   * 
   * This property tests that:
   * 1. Tokens are created with an expiration time
   * 2. Valid tokens (not expired) can be verified successfully
   * 3. Expired tokens are rejected with an error
   * 4. The expiration time is enforced consistently
   */
  it('Property 42: tokens should expire after defined time period and be rejected', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate random user IDs and emails
        fc.string({ minLength: 10, maxLength: 30 }),
        fc.emailAddress(),
        async (userId, email) => {
          const payload: TokenPayload = { userId, email };
          
          // Generate a token with a very short expiration (1 second)
          const shortLivedToken = jwt.sign(payload, JWT_SECRET, { expiresIn: '1s' });
          
          // Property 1: Token should be verifiable immediately after creation
          const decodedImmediate = verifyToken(shortLivedToken);
          expect(decodedImmediate.userId).toBe(userId);
          expect(decodedImmediate.email).toBe(email);
          
          // Property 2: Wait for token to expire
          await new Promise(resolve => setTimeout(resolve, 1500)); // Wait 1.5 seconds
          
          // Property 3: Expired token should be rejected
          expect(() => verifyToken(shortLivedToken)).toThrow('Invalid or expired token');
        }
      ),
      { numRuns: 10 } // Reduced runs due to time delays
    );
  }, 30000); // Increased timeout to account for delays

  /**
   * Additional property: Tokens with expiration should contain exp claim
   */
  it('Property 42 (exp claim): tokens should contain expiration timestamp', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 10, maxLength: 30 }),
        fc.emailAddress(),
        (userId, email) => {
          const payload: TokenPayload = { userId, email };
          const token = generateToken(payload);
          
          // Decode token without verification to inspect claims
          const decoded = jwt.decode(token) as any;
          
          // Property: Token should have an 'exp' claim
          expect(decoded).toHaveProperty('exp');
          expect(typeof decoded.exp).toBe('number');
          
          // Property: exp should be in the future
          const now = Math.floor(Date.now() / 1000);
          expect(decoded.exp).toBeGreaterThan(now);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Additional property: Token expiration should be consistent with configured time
   */
  it('Property 42 (consistency): token expiration should match configured duration', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 10, maxLength: 30 }),
        fc.emailAddress(),
        (userId, email) => {
          const payload: TokenPayload = { userId, email };
          const token = generateToken(payload);
          
          const decoded = jwt.decode(token) as any;
          const now = Math.floor(Date.now() / 1000);
          
          // Default expiration is 24 hours (86400 seconds)
          const expectedExpiration = 24 * 60 * 60; // 24 hours in seconds
          const actualExpiration = decoded.exp - decoded.iat;
          
          // Allow 1 second tolerance for processing time
          expect(actualExpiration).toBeGreaterThanOrEqual(expectedExpiration - 1);
          expect(actualExpiration).toBeLessThanOrEqual(expectedExpiration + 1);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Additional property: Different tokens should have different expiration times
   * (when created at different times with sufficient delay)
   */
  it('Property 42 (uniqueness): tokens created at different times should have different exp', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 10, maxLength: 30 }),
        fc.emailAddress(),
        async (userId, email) => {
          const payload: TokenPayload = { userId, email };
          
          // Create first token
          const token1 = generateToken(payload);
          const decoded1 = jwt.decode(token1) as any;
          
          // Wait at least 1 second to ensure different iat timestamp
          await new Promise(resolve => setTimeout(resolve, 1100));
          
          // Create second token
          const token2 = generateToken(payload);
          const decoded2 = jwt.decode(token2) as any;
          
          // Property: Tokens created at different times (>1s apart) should have different iat and exp
          // JWT timestamps are in seconds, so we need at least 1 second difference
          expect(decoded1.iat).not.toBe(decoded2.iat);
          expect(decoded1.exp).not.toBe(decoded2.exp);
        }
      ),
      { numRuns: 10 } // Reduced due to time delays (1.1s per run)
    );
  }, 20000);

  /**
   * Additional property: Tokens should not be verifiable after expiration
   * regardless of payload content
   */
  it('Property 42 (rejection): expired tokens should always be rejected', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 10, maxLength: 30 }),
        fc.emailAddress(),
        fc.string({ minLength: 5, maxLength: 20 }),
        async (userId, email, extraData) => {
          // Create token with custom payload and short expiration
          const payload = { userId, email, extraData };
          const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '1s' });
          
          // Wait for expiration
          await new Promise(resolve => setTimeout(resolve, 1500));
          
          // Property: Any expired token should throw an error
          let errorThrown = false;
          try {
            verifyToken(token);
          } catch (error: any) {
            errorThrown = true;
            expect(error.message).toBe('Invalid or expired token');
          }
          
          expect(errorThrown).toBe(true);
        }
      ),
      { numRuns: 10 } // Reduced due to time delays
    );
  }, 30000);
});
