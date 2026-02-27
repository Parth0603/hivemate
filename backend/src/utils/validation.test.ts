import * as fc from 'fast-check';
import { validateProfile } from './validation';

/**
 * Property-Based Tests for Profile Creation Validation
 * Feature: socialhive-platform, Property 1: Profile Creation Validation
 * Validates: Requirements 1.3
 */

describe('Profile Creation Validation - Property-Based Tests', () => {
  /**
   * Property 1: Profile Creation Validation
   * For any profile creation attempt, if any required field (name, age, place, skills, 
   * profession, photo) is missing, the system should reject the creation and return 
   * a validation error.
   * 
   * This property tests that:
   * 1. Missing any required field results in validation failure
   * 2. Invalid field types result in validation failure
   * 3. Invalid field values result in validation failure
   * 4. Valid profiles with all required fields pass validation
   */

  // Arbitrary for generating valid profile data
  const validProfileArbitrary = fc.record({
    name: fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
    age: fc.integer({ min: 18, max: 120 }),
    gender: fc.constantFrom('male', 'female', 'other'),
    place: fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
    skills: fc.array(fc.string({ minLength: 1, maxLength: 30 }).filter(s => s.trim().length > 0), { minLength: 1, maxLength: 20 }),
    profession: fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
    photo: fc.webUrl(),
    bio: fc.string({ minLength: 1, maxLength: 500 }).filter(s => s.trim().length > 0)
  });

  it('Property 1: should reject profiles missing required field - name', () => {
    fc.assert(
      fc.property(
        validProfileArbitrary,
        (profile) => {
          // Remove name field
          const { name, ...profileWithoutName } = profile;
          
          const result = validateProfile(profileWithoutName);
          
          // Property: Validation should fail
          expect(result.valid).toBe(false);
          expect(result.errors).toContain('Name is required');
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 1: should reject profiles missing required field - age', () => {
    fc.assert(
      fc.property(
        validProfileArbitrary,
        (profile) => {
          // Remove age field
          const { age, ...profileWithoutAge } = profile;
          
          const result = validateProfile(profileWithoutAge);
          
          // Property: Validation should fail
          expect(result.valid).toBe(false);
          expect(result.errors.some(e => e.includes('Age'))).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 1: should reject profiles missing required field - gender', () => {
    fc.assert(
      fc.property(
        validProfileArbitrary,
        (profile) => {
          // Remove gender field
          const { gender, ...profileWithoutGender } = profile;
          
          const result = validateProfile(profileWithoutGender);
          
          // Property: Validation should fail
          expect(result.valid).toBe(false);
          expect(result.errors.some(e => e.includes('Gender'))).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 1: should reject profiles missing required field - place', () => {
    fc.assert(
      fc.property(
        validProfileArbitrary,
        (profile) => {
          // Remove place field
          const { place, ...profileWithoutPlace } = profile;
          
          const result = validateProfile(profileWithoutPlace);
          
          // Property: Validation should fail
          expect(result.valid).toBe(false);
          expect(result.errors).toContain('Place is required');
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 1: should reject profiles missing required field - skills', () => {
    fc.assert(
      fc.property(
        validProfileArbitrary,
        (profile) => {
          // Remove skills field
          const { skills, ...profileWithoutSkills } = profile;
          
          const result = validateProfile(profileWithoutSkills);
          
          // Property: Validation should fail
          expect(result.valid).toBe(false);
          expect(result.errors).toContain('At least one skill is required');
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 1: should reject profiles missing required field - profession', () => {
    fc.assert(
      fc.property(
        validProfileArbitrary,
        (profile) => {
          // Remove profession field
          const { profession, ...profileWithoutProfession } = profile;
          
          const result = validateProfile(profileWithoutProfession);
          
          // Property: Validation should fail
          expect(result.valid).toBe(false);
          expect(result.errors).toContain('Profession is required');
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 1: should reject profiles missing required field - photo', () => {
    fc.assert(
      fc.property(
        validProfileArbitrary,
        (profile) => {
          // Remove photo field
          const { photo, ...profileWithoutPhoto } = profile;
          
          const result = validateProfile(profileWithoutPhoto);
          
          // Property: Validation should fail
          expect(result.valid).toBe(false);
          expect(result.errors).toContain('At least one photo is required');
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 1: should reject profiles missing required field - bio', () => {
    fc.assert(
      fc.property(
        validProfileArbitrary,
        (profile) => {
          // Remove bio field
          const { bio, ...profileWithoutBio } = profile;
          
          const result = validateProfile(profileWithoutBio);
          
          // Property: Validation should fail
          expect(result.valid).toBe(false);
          expect(result.errors).toContain('Bio is required');
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 1: should reject profiles with invalid age (too young)', () => {
    fc.assert(
      fc.property(
        validProfileArbitrary,
        fc.integer({ min: 1, max: 17 }),
        (profile, invalidAge) => {
          const invalidProfile = { ...profile, age: invalidAge };
          
          const result = validateProfile(invalidProfile);
          
          // Property: Validation should fail
          expect(result.valid).toBe(false);
          expect(result.errors).toContain('Age must be between 18 and 120');
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 1: should reject profiles with invalid age (too old)', () => {
    fc.assert(
      fc.property(
        validProfileArbitrary,
        fc.integer({ min: 121, max: 200 }),
        (profile, invalidAge) => {
          const invalidProfile = { ...profile, age: invalidAge };
          
          const result = validateProfile(invalidProfile);
          
          // Property: Validation should fail
          expect(result.valid).toBe(false);
          expect(result.errors).toContain('Age must be between 18 and 120');
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 1: should reject profiles with empty skills array', () => {
    fc.assert(
      fc.property(
        validProfileArbitrary,
        (profile) => {
          const invalidProfile = { ...profile, skills: [] };
          
          const result = validateProfile(invalidProfile);
          
          // Property: Validation should fail
          expect(result.valid).toBe(false);
          expect(result.errors).toContain('At least one skill is required');
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 1: should reject profiles with invalid gender', () => {
    fc.assert(
      fc.property(
        validProfileArbitrary,
        fc.string({ minLength: 1, maxLength: 20 }).filter(s => !['male', 'female', 'other'].includes(s)),
        (profile, invalidGender) => {
          const invalidProfile = { ...profile, gender: invalidGender };
          
          const result = validateProfile(invalidProfile);
          
          // Property: Validation should fail
          expect(result.valid).toBe(false);
          expect(result.errors.some(e => e.includes('Gender'))).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 1: should reject profiles with bio exceeding 500 characters', () => {
    fc.assert(
      fc.property(
        validProfileArbitrary,
        fc.string({ minLength: 501, maxLength: 1000 }),
        (profile, longBio) => {
          const invalidProfile = { ...profile, bio: longBio };
          
          const result = validateProfile(invalidProfile);
          
          // Property: Validation should fail
          expect(result.valid).toBe(false);
          expect(result.errors).toContain('Bio must not exceed 500 characters');
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 1: should accept valid profiles with all required fields', () => {
    fc.assert(
      fc.property(
        validProfileArbitrary,
        (profile) => {
          const result = validateProfile(profile);
          
          // Property: Validation should succeed
          expect(result.valid).toBe(true);
          expect(result.errors).toHaveLength(0);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 1: should reject profiles with empty string for required text fields', () => {
    fc.assert(
      fc.property(
        validProfileArbitrary,
        fc.constantFrom('name', 'place', 'profession', 'bio'),
        (profile, fieldToEmpty) => {
          const invalidProfile = { ...profile, [fieldToEmpty]: '' };
          
          const result = validateProfile(invalidProfile);
          
          // Property: Validation should fail
          expect(result.valid).toBe(false);
          expect(result.errors.length).toBeGreaterThan(0);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 1: should reject profiles with whitespace-only strings for required text fields', () => {
    fc.assert(
      fc.property(
        validProfileArbitrary,
        fc.constantFrom('name', 'place', 'profession'),
        fc.stringOf(fc.constantFrom(' ', '\t', '\n'), { minLength: 1, maxLength: 10 }),
        (profile, fieldToEmpty, whitespace) => {
          const invalidProfile = { ...profile, [fieldToEmpty]: whitespace };
          
          const result = validateProfile(invalidProfile);
          
          // Property: Validation should fail
          expect(result.valid).toBe(false);
          expect(result.errors.length).toBeGreaterThan(0);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 1: should reject profiles with more than 5 photos', () => {
    fc.assert(
      fc.property(
        validProfileArbitrary,
        fc.array(fc.webUrl(), { minLength: 6, maxLength: 10 }),
        (profile, tooManyPhotos) => {
          const invalidProfile = { ...profile, photos: tooManyPhotos };
          
          const result = validateProfile(invalidProfile);
          
          // Property: Validation should fail
          expect(result.valid).toBe(false);
          expect(result.errors).toContain('Maximum 5 photos allowed');
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 1: should reject profiles with invalid data types', () => {
    fc.assert(
      fc.property(
        validProfileArbitrary,
        (profile) => {
          // Test with age as string instead of number
          const invalidProfile = { ...profile, age: '25' as any };
          
          const result = validateProfile(invalidProfile);
          
          // Property: Validation should fail
          expect(result.valid).toBe(false);
          expect(result.errors.some(e => e.includes('Age'))).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 1: should reject profiles with skills as non-array', () => {
    fc.assert(
      fc.property(
        validProfileArbitrary,
        (profile) => {
          // Test with skills as string instead of array
          const invalidProfile = { ...profile, skills: 'JavaScript, Python' as any };
          
          const result = validateProfile(invalidProfile);
          
          // Property: Validation should fail
          expect(result.valid).toBe(false);
          expect(result.errors).toContain('At least one skill is required');
        }
      ),
      { numRuns: 100 }
    );
  });
});

/**
 * Property-Based Tests for Optional Fields Acceptance
 * Feature: socialhive-platform, Property 2: Optional Fields Acceptance
 * Validates: Requirements 1.4
 */

describe('Optional Fields Acceptance - Property-Based Tests', () => {
  /**
   * Property 2: Optional Fields Acceptance
   * For any profile creation attempt with all required fields present, adding or omitting 
   * optional fields (college, company, verification, website URL, achievements) should not 
   * cause the creation to fail.
   * 
   * This property tests that:
   * 1. Profiles with all required fields and no optional fields pass validation
   * 2. Profiles with all required fields and some optional fields pass validation
   * 3. Profiles with all required fields and all optional fields pass validation
   * 4. Optional fields can be omitted without causing validation failure
   */

  // Arbitrary for generating valid profile data with required fields only
  const validProfileArbitrary = fc.record({
    name: fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
    age: fc.integer({ min: 18, max: 120 }),
    gender: fc.constantFrom('male', 'female', 'other'),
    place: fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
    skills: fc.array(fc.string({ minLength: 1, maxLength: 30 }).filter(s => s.trim().length > 0), { minLength: 1, maxLength: 20 }),
    profession: fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
    photo: fc.webUrl(),
    bio: fc.string({ minLength: 1, maxLength: 500 }).filter(s => s.trim().length > 0)
  });

  // Arbitrary for generating optional fields
  const optionalFieldsArbitrary = fc.record({
    college: fc.option(fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0), { nil: undefined }),
    company: fc.option(fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0), { nil: undefined }),
    verified: fc.option(fc.boolean(), { nil: undefined }),
    websiteUrl: fc.option(fc.webUrl(), { nil: undefined }),
    achievements: fc.option(fc.array(fc.string({ minLength: 1, maxLength: 200 }).filter(s => s.trim().length > 0), { minLength: 0, maxLength: 10 }), { nil: undefined })
  });

  it('Property 2: should accept profiles with all required fields and no optional fields', () => {
    fc.assert(
      fc.property(
        validProfileArbitrary,
        (profile) => {
          const result = validateProfile(profile);
          
          // Property: Validation should succeed
          expect(result.valid).toBe(true);
          expect(result.errors).toHaveLength(0);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 2: should accept profiles with all required fields and some optional fields', () => {
    fc.assert(
      fc.property(
        validProfileArbitrary,
        optionalFieldsArbitrary,
        (profile, optionalFields) => {
          const profileWithOptionals = { ...profile, ...optionalFields };
          
          const result = validateProfile(profileWithOptionals);
          
          // Property: Validation should succeed
          expect(result.valid).toBe(true);
          expect(result.errors).toHaveLength(0);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 2: should accept profiles with all required fields and all optional fields present', () => {
    fc.assert(
      fc.property(
        validProfileArbitrary,
        fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
        fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
        fc.boolean(),
        fc.webUrl(),
        fc.array(fc.string({ minLength: 1, maxLength: 200 }).filter(s => s.trim().length > 0), { minLength: 1, maxLength: 10 }),
        (profile, college, company, verified, websiteUrl, achievements) => {
          const profileWithAllOptionals = {
            ...profile,
            college,
            company,
            verified,
            websiteUrl,
            achievements
          };
          
          const result = validateProfile(profileWithAllOptionals);
          
          // Property: Validation should succeed
          expect(result.valid).toBe(true);
          expect(result.errors).toHaveLength(0);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 2: should accept profiles with only college optional field', () => {
    fc.assert(
      fc.property(
        validProfileArbitrary,
        fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
        (profile, college) => {
          const profileWithCollege = { ...profile, college };
          
          const result = validateProfile(profileWithCollege);
          
          // Property: Validation should succeed
          expect(result.valid).toBe(true);
          expect(result.errors).toHaveLength(0);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 2: should accept profiles with only company optional field', () => {
    fc.assert(
      fc.property(
        validProfileArbitrary,
        fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
        (profile, company) => {
          const profileWithCompany = { ...profile, company };
          
          const result = validateProfile(profileWithCompany);
          
          // Property: Validation should succeed
          expect(result.valid).toBe(true);
          expect(result.errors).toHaveLength(0);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 2: should accept profiles with only verified optional field', () => {
    fc.assert(
      fc.property(
        validProfileArbitrary,
        fc.boolean(),
        (profile, verified) => {
          const profileWithVerified = { ...profile, verified };
          
          const result = validateProfile(profileWithVerified);
          
          // Property: Validation should succeed
          expect(result.valid).toBe(true);
          expect(result.errors).toHaveLength(0);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 2: should accept profiles with only websiteUrl optional field', () => {
    fc.assert(
      fc.property(
        validProfileArbitrary,
        fc.webUrl(),
        (profile, websiteUrl) => {
          const profileWithWebsite = { ...profile, websiteUrl };
          
          const result = validateProfile(profileWithWebsite);
          
          // Property: Validation should succeed
          expect(result.valid).toBe(true);
          expect(result.errors).toHaveLength(0);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 2: should accept profiles with only achievements optional field', () => {
    fc.assert(
      fc.property(
        validProfileArbitrary,
        fc.array(fc.string({ minLength: 1, maxLength: 200 }).filter(s => s.trim().length > 0), { minLength: 1, maxLength: 10 }),
        (profile, achievements) => {
          const profileWithAchievements = { ...profile, achievements };
          
          const result = validateProfile(profileWithAchievements);
          
          // Property: Validation should succeed
          expect(result.valid).toBe(true);
          expect(result.errors).toHaveLength(0);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 2: should accept profiles with empty achievements array', () => {
    fc.assert(
      fc.property(
        validProfileArbitrary,
        (profile) => {
          const profileWithEmptyAchievements = { ...profile, achievements: [] };
          
          const result = validateProfile(profileWithEmptyAchievements);
          
          // Property: Validation should succeed (empty array is valid for optional field)
          expect(result.valid).toBe(true);
          expect(result.errors).toHaveLength(0);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 2: should accept profiles with undefined optional fields', () => {
    fc.assert(
      fc.property(
        validProfileArbitrary,
        (profile) => {
          const profileWithUndefinedOptionals = {
            ...profile,
            college: undefined,
            company: undefined,
            verified: undefined,
            websiteUrl: undefined,
            achievements: undefined
          };
          
          const result = validateProfile(profileWithUndefinedOptionals);
          
          // Property: Validation should succeed
          expect(result.valid).toBe(true);
          expect(result.errors).toHaveLength(0);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 2: should accept profiles with random combinations of optional fields', () => {
    fc.assert(
      fc.property(
        validProfileArbitrary,
        fc.boolean(),
        fc.boolean(),
        fc.boolean(),
        fc.boolean(),
        fc.boolean(),
        fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
        fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
        fc.boolean(),
        fc.webUrl(),
        fc.array(fc.string({ minLength: 1, maxLength: 200 }).filter(s => s.trim().length > 0), { minLength: 1, maxLength: 10 }),
        (profile, includeCollege, includeCompany, includeVerified, includeWebsite, includeAchievements, 
         college, company, verified, websiteUrl, achievements) => {
          const profileWithRandomOptionals = {
            ...profile,
            ...(includeCollege ? { college } : {}),
            ...(includeCompany ? { company } : {}),
            ...(includeVerified ? { verified } : {}),
            ...(includeWebsite ? { websiteUrl } : {}),
            ...(includeAchievements ? { achievements } : {})
          };
          
          const result = validateProfile(profileWithRandomOptionals);
          
          // Property: Validation should succeed regardless of which optional fields are included
          expect(result.valid).toBe(true);
          expect(result.errors).toHaveLength(0);
        }
      ),
      { numRuns: 100 }
    );
  });
});
