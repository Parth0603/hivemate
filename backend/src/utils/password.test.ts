import * as fc from 'fast-check';
import * as bcrypt from 'bcrypt';
import { hashPassword, comparePassword } from './password';

/**
 * Property-Based Tests for Password Hashing
 * Feature: socialhive-platform, Property 41: Password Hashing
 * Validates: Requirements 19.1
 */

describe('Password Hashing - Property-Based Tests', () => {
  /**
   * Property 41: Password Hashing
   * For any user account created or password updated, the password should be hashed 
   * before storage, and the plaintext password should never be stored in the database.
   * 
   * This property tests that:
   * 1. The hash is different from the plaintext password
   * 2. The hash can be used to verify the original password
   * 3. The hash is deterministic (same password produces verifiable hash)
   * 4. Different passwords produce different hashes
   */
  it('Property 41: should never store plaintext passwords - hash must differ from original', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate random passwords with various characteristics
        fc.string({ minLength: 8, maxLength: 64 }),
        async (password) => {
          // Hash the password
          const hash = await hashPassword(password);
          
          // Property 1: Hash must be different from plaintext
          expect(hash).not.toBe(password);
          
          // Property 2: Hash must not contain the plaintext password
          expect(hash).not.toContain(password);
          
          // Property 3: Hash should be verifiable with the original password
          const isValid = await comparePassword(password, hash);
          expect(isValid).toBe(true);
          
          // Property 4: Hash should not verify with a different password
          if (password.length > 0) {
            const differentPassword = password + 'x';
            const isInvalid = await comparePassword(differentPassword, hash);
            expect(isInvalid).toBe(false);
          }
        }
      ),
      { numRuns: 20 } // Reduced from 100 to 20 for faster execution
    );
  }, 60000); // Increase timeout for property-based testing

  /**
   * Additional property: Different passwords should produce different hashes
   */
  it('Property 41 (uniqueness): different passwords should produce different hashes', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 8, maxLength: 64 }),
        fc.string({ minLength: 8, maxLength: 64 }),
        async (password1, password2) => {
          // Skip if passwords are the same
          fc.pre(password1 !== password2);
          
          const hash1 = await hashPassword(password1);
          const hash2 = await hashPassword(password2);
          
          // Different passwords should produce different hashes
          expect(hash1).not.toBe(hash2);
        }
      ),
      { numRuns: 20 } // Reduced from 100 to 20 for faster execution
    );
  }, 60000);

  /**
   * Additional property: Hash should be consistent format (bcrypt format)
   */
  it('Property 41 (format): hash should follow bcrypt format', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 8, maxLength: 64 }),
        async (password) => {
          const hash = await hashPassword(password);
          
          // Bcrypt hashes start with $2a$, $2b$, or $2y$ followed by cost factor
          expect(hash).toMatch(/^\$2[aby]\$\d{2}\$/);
          
          // Bcrypt hashes are 60 characters long
          expect(hash.length).toBe(60);
        }
      ),
      { numRuns: 20 } // Reduced from 100 to 20 for faster execution
    );
  }, 60000);
});
