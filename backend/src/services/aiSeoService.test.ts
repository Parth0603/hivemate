import * as fc from 'fast-check';
import { AISeoService } from './aiSeoService';

/**
 * Property-Based Tests for AI SEO Service
 * Feature: socialhive-platform, Property 4: AI Keyword Generation
 * Validates: Requirements 2.1, 2.2
 */

describe('AI SEO Service - Property-Based Tests', () => {
  /**
   * Property 4: AI Keyword Generation
   * For any completed profile, the AI SEO service should generate a non-empty 
   * list of optimized keywords based on the profile content.
   * 
   * This property tests that:
   * 1. Keywords are always generated (non-empty array)
   * 2. Keywords are derived from profile content
   * 3. Keywords are normalized (lowercase, trimmed)
   * 4. Keywords include skills and profession
   */
  it('Property 4: should generate non-empty keyword list for any completed profile', () => {
    fc.assert(
      fc.property(
        // Generate random profile data
        fc.record({
          skills: fc.array(fc.string({ minLength: 1, maxLength: 30 }), { minLength: 1, maxLength: 10 }),
          profession: fc.string({ minLength: 1, maxLength: 50 }),
          bio: fc.string({ minLength: 10, maxLength: 500 }),
          achievements: fc.option(fc.array(fc.string({ minLength: 10, maxLength: 200 }), { minLength: 0, maxLength: 5 }))
        }),
        (profileData) => {
          // Extract keywords using AI SEO service
          const keywords = AISeoService.extractKeywords(profileData);
          
          // Property 1: Keywords array must be non-empty
          expect(keywords.length).toBeGreaterThan(0);
          
          // Property 2: Keywords should be strings
          keywords.forEach(keyword => {
            expect(typeof keyword).toBe('string');
          });
          
          // Property 3: Keywords should be normalized (lowercase, no leading/trailing spaces)
          keywords.forEach(keyword => {
            expect(keyword).toBe(keyword.toLowerCase());
            expect(keyword).toBe(keyword.trim());
          });
          
          // Property 4: Keywords should include skills (normalized)
          const normalizedSkills = profileData.skills.map(s => s.toLowerCase().trim());
          normalizedSkills.forEach(skill => {
            if (skill.length > 0) {
              expect(keywords).toContain(skill);
            }
          });
          
          // Property 5: Keywords should include profession (normalized)
          const normalizedProfession = profileData.profession.toLowerCase().trim();
          if (normalizedProfession.length > 0) {
            expect(keywords).toContain(normalizedProfession);
          }
        }
      ),
      { numRuns: 100 } // Run 100 iterations as specified in design
    );
  });

  /**
   * Additional property: Keywords should be unique (no duplicates)
   */
  it('Property 4 (uniqueness): should generate unique keywords without duplicates', () => {
    fc.assert(
      fc.property(
        fc.record({
          skills: fc.array(fc.string({ minLength: 1, maxLength: 30 }), { minLength: 1, maxLength: 10 }),
          profession: fc.string({ minLength: 1, maxLength: 50 }),
          bio: fc.string({ minLength: 10, maxLength: 500 }),
          achievements: fc.option(fc.array(fc.string({ minLength: 10, maxLength: 200 }), { minLength: 0, maxLength: 5 }))
        }),
        (profileData) => {
          const keywords = AISeoService.extractKeywords(profileData);
          
          // Keywords should be unique (no duplicates)
          const uniqueKeywords = new Set(keywords);
          expect(keywords.length).toBe(uniqueKeywords.size);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Additional property: optimizeProfile should return complete optimization result
   */
  it('Property 4 (optimization): should return complete optimization with keywords, tags, and score', () => {
    fc.assert(
      fc.property(
        fc.record({
          skills: fc.array(fc.string({ minLength: 1, maxLength: 30 }), { minLength: 1, maxLength: 10 }),
          profession: fc.string({ minLength: 1, maxLength: 50 }),
          bio: fc.string({ minLength: 10, maxLength: 500 }),
          achievements: fc.option(fc.array(fc.string({ minLength: 10, maxLength: 200 }), { minLength: 0, maxLength: 5 }))
        }),
        (profileData) => {
          const result = AISeoService.optimizeProfile(profileData);
          
          // Result should have all required fields
          expect(result).toHaveProperty('keywords');
          expect(result).toHaveProperty('semanticTags');
          expect(result).toHaveProperty('rankingScore');
          
          // Keywords should be non-empty
          expect(result.keywords.length).toBeGreaterThan(0);
          
          // Semantic tags should be an array
          expect(Array.isArray(result.semanticTags)).toBe(true);
          
          // Ranking score should be a number between 0 and 100
          expect(typeof result.rankingScore).toBe('number');
          expect(result.rankingScore).toBeGreaterThanOrEqual(0);
          expect(result.rankingScore).toBeLessThanOrEqual(100);
        }
      ),
      { numRuns: 100 }
    );
  });
});
