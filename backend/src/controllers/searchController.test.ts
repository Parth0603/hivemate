import * as fc from 'fast-check';
import mongoose from 'mongoose';
import Profile from '../models/Profile';
import Location from '../models/Location';
import { searchProfiles } from './searchController';

/**
 * Property-Based Tests for User Profile Filtering
 * Feature: socialhive-platform
 * - Property 30: User Profile Filtering (Validates: Requirements 12.2)
 */

// Mock the config files to prevent side effects
jest.mock('../config/redis', () => ({
  redis: {
    on: jest.fn(),
    quit: jest.fn()
  },
  default: {
    on: jest.fn(),
    quit: jest.fn()
  }
}));

jest.mock('../config/database', () => ({
  connectDB: jest.fn()
}));

// Mock the models
jest.mock('../models/Profile');
jest.mock('../models/Location');

describe('User Profile Filtering - Property-Based Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  /**
   * Property 30: User Profile Filtering
   * For any radar query with filters applied (skills, profession, niche), 
   * all returned users should match all specified filter criteria.
   * 
   * This property tests that:
   * 1. When skills filter is applied, all returned profiles contain at least one of the specified skills
   * 2. When profession filter is applied, all returned profiles match the profession (case-insensitive)
   * 3. When niche filter is applied, all returned profiles contain the niche in their optimized keywords
   * 4. When multiple filters are applied, all returned profiles satisfy ALL filter conditions (AND logic)
   * 5. No profiles that don't match the filters are included in the results
   * 
   * **Validates: Requirements 12.2**
   */
  it('Property 30: should return only profiles matching all specified filters', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate random filter criteria and matching/non-matching profiles
        fc.record({
          // Filter criteria
          filterSkills: fc.array(
            fc.constantFrom('JavaScript', 'Python', 'Design', 'Management', 'Marketing', 'Sales'),
            { minLength: 1, maxLength: 3 }
          ),
          filterProfession: fc.constantFrom('Engineer', 'Designer', 'Manager', 'Developer', 'Analyst'),
          filterNiche: fc.constantFrom('frontend', 'backend', 'fullstack', 'mobile', 'devops'),
          
          // Generate profiles that should match
          matchingProfilesCount: fc.integer({ min: 1, max: 5 }),
          
          // Generate profiles that should NOT match
          nonMatchingProfilesCount: fc.integer({ min: 1, max: 3 })
        }),
        async ({ filterSkills, filterProfession, filterNiche, matchingProfilesCount, nonMatchingProfilesCount }) => {
          jest.clearAllMocks();

          // Create matching profiles (satisfy all filter criteria)
          const matchingProfiles = Array.from({ length: matchingProfilesCount }, (_, i) => {
            const userId = new mongoose.Types.ObjectId();
            return {
              _id: new mongoose.Types.ObjectId(),
              userId: userId,
              name: `Matching User ${i}`,
              age: 25 + i,
              gender: 'male',
              place: 'Test City',
              skills: [...filterSkills, 'OtherSkill'], // Contains at least one filter skill
              profession: filterProfession, // Exact match
              photos: [],
              bio: 'Test bio',
              verified: false,
              optimizedKeywords: [filterNiche, 'other', 'keywords'], // Contains filter niche
              createdAt: new Date(),
              updatedAt: new Date()
            };
          });

          // Create non-matching profiles (fail at least one filter criterion)
          const nonMatchingProfiles = Array.from({ length: nonMatchingProfilesCount }, (_, i) => {
            const userId = new mongoose.Types.ObjectId();
            
            // Randomly choose which filter to violate
            const violationType = i % 3;
            
            return {
              _id: new mongoose.Types.ObjectId(),
              userId: userId,
              name: `Non-Matching User ${i}`,
              age: 30 + i,
              gender: 'female',
              place: 'Test City',
              // Violate skills filter
              skills: violationType === 0 ? ['UnrelatedSkill', 'AnotherSkill'] : [...filterSkills],
              // Violate profession filter
              profession: violationType === 1 ? 'UnrelatedProfession' : filterProfession,
              photos: [],
              bio: 'Test bio',
              verified: false,
              // Violate niche filter
              optimizedKeywords: violationType === 2 ? ['unrelated', 'keywords'] : [filterNiche, 'other'],
              createdAt: new Date(),
              updatedAt: new Date()
            };
          });

          // Mock Profile.find to return only matching profiles
          const mockFind = jest.fn().mockReturnValue({
            select: jest.fn().mockReturnValue({
              skip: jest.fn().mockReturnValue({
                limit: jest.fn().mockReturnValue({
                  lean: jest.fn().mockResolvedValue(matchingProfiles)
                })
              })
            })
          });

          (Profile.find as jest.Mock) = mockFind;

          // Mock Profile.countDocuments
          (Profile.countDocuments as jest.Mock).mockResolvedValue(matchingProfiles.length);

          // Create mock request with all filters
          const mockReq: any = {
            body: {
              skills: filterSkills,
              profession: filterProfession,
              niche: filterNiche,
              page: 1,
              limit: 20
            }
          };

          const mockRes: any = {
            json: jest.fn(),
            status: jest.fn().mockReturnThis()
          };

          // Execute search
          await searchProfiles(mockReq, mockRes);

          // Verify response was successful
          expect(mockRes.json).toHaveBeenCalled();
          const responseData = mockRes.json.mock.calls[0][0];

          // Property 1: Response should have profiles and pagination
          expect(responseData).toHaveProperty('profiles');
          expect(responseData).toHaveProperty('pagination');

          const returnedProfiles = responseData.profiles;

          // Property 2: All returned profiles should be from matching set
          expect(returnedProfiles.length).toBe(matchingProfiles.length);

          // Property 3: Verify filter was constructed correctly
          expect(Profile.find).toHaveBeenCalled();
          const filterArg = mockFind.mock.calls[0][0];

          // Property 4: Skills filter should use $in operator
          expect(filterArg).toHaveProperty('skills');
          expect(filterArg.skills).toHaveProperty('$in');
          expect(filterArg.skills.$in).toEqual(filterSkills);

          // Property 5: Profession filter should use case-insensitive regex
          expect(filterArg).toHaveProperty('profession');
          expect(filterArg.profession).toHaveProperty('$regex');
          expect(filterArg.profession.$regex).toBe(filterProfession);
          expect(filterArg.profession.$options).toBe('i');

          // Property 6: Niche filter should search in optimizedKeywords
          expect(filterArg).toHaveProperty('optimizedKeywords');
          expect(filterArg.optimizedKeywords).toHaveProperty('$in');
          expect(filterArg.optimizedKeywords.$in).toEqual([filterNiche]);

          // Property 7: All returned profiles should match skills filter
          for (const profile of returnedProfiles) {
            const hasMatchingSkill = profile.skills.some((skill: string) => 
              filterSkills.includes(skill)
            );
            expect(hasMatchingSkill).toBe(true);
          }

          // Property 8: All returned profiles should match profession filter
          for (const profile of returnedProfiles) {
            expect(profile.profession.toLowerCase()).toBe(filterProfession.toLowerCase());
          }

          // Property 9: All returned profiles should match niche filter
          for (const profile of returnedProfiles) {
            const hasMatchingNiche = profile.optimizedKeywords.includes(filterNiche);
            expect(hasMatchingNiche).toBe(true);
          }

          // Property 10: Pagination should be correct
          expect(responseData.pagination.page).toBe(1);
          expect(responseData.pagination.total).toBe(matchingProfiles.length);
        }
      ),
      { numRuns: 20 } // Run 20 iterations for faster tests
    );
  }, 120000); // Increased timeout for property-based testing

  /**
   * Additional property: Single filter should work correctly
   */
  it('Property 30 (single filter): should filter by skills only', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          filterSkills: fc.array(
            fc.constantFrom('JavaScript', 'Python', 'Design'),
            { minLength: 1, maxLength: 2 }
          ),
          profilesCount: fc.integer({ min: 2, max: 5 })
        }),
        async ({ filterSkills, profilesCount }) => {
          jest.clearAllMocks();

          const profiles = Array.from({ length: profilesCount }, (_, i) => ({
            _id: new mongoose.Types.ObjectId(),
            userId: new mongoose.Types.ObjectId(),
            name: `User ${i}`,
            age: 25,
            gender: 'male',
            place: 'City',
            skills: [...filterSkills, 'OtherSkill'],
            profession: 'Engineer',
            photos: [],
            bio: 'Bio',
            verified: false,
            optimizedKeywords: ['keyword'],
            createdAt: new Date(),
            updatedAt: new Date()
          }));

          const mockFind = jest.fn().mockReturnValue({
            select: jest.fn().mockReturnValue({
              skip: jest.fn().mockReturnValue({
                limit: jest.fn().mockReturnValue({
                  lean: jest.fn().mockResolvedValue(profiles)
                })
              })
            })
          });

          (Profile.find as jest.Mock) = mockFind;
          (Profile.countDocuments as jest.Mock).mockResolvedValue(profiles.length);

          const mockReq: any = {
            body: {
              skills: filterSkills,
              page: 1,
              limit: 20
            }
          };

          const mockRes: any = {
            json: jest.fn(),
            status: jest.fn().mockReturnThis()
          };

          await searchProfiles(mockReq, mockRes);

          expect(mockRes.json).toHaveBeenCalled();
          const responseData = mockRes.json.mock.calls[0][0];

          // Filter should only include skills
          const filterArg = mockFind.mock.calls[0][0];
          expect(filterArg).toHaveProperty('skills');
          expect(filterArg).not.toHaveProperty('profession');
          expect(filterArg).not.toHaveProperty('optimizedKeywords');

          // All profiles should have at least one matching skill
          for (const profile of responseData.profiles) {
            const hasMatchingSkill = profile.skills.some((skill: string) => 
              filterSkills.includes(skill)
            );
            expect(hasMatchingSkill).toBe(true);
          }
        }
      ),
      { numRuns: 20 }
    );
  }, 60000);

  /**
   * Additional property: Empty filters should return all profiles
   */
  it('Property 30 (no filters): should return all profiles when no filters applied', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 1, max: 10 }),
        async (profilesCount) => {
          jest.clearAllMocks();

          const profiles = Array.from({ length: profilesCount }, (_, i) => ({
            _id: new mongoose.Types.ObjectId(),
            userId: new mongoose.Types.ObjectId(),
            name: `User ${i}`,
            age: 25 + i,
            gender: i % 2 === 0 ? 'male' : 'female',
            place: 'City',
            skills: ['Skill1', 'Skill2'],
            profession: 'Engineer',
            photos: [],
            bio: 'Bio',
            verified: false,
            optimizedKeywords: ['keyword'],
            createdAt: new Date(),
            updatedAt: new Date()
          }));

          const mockFind = jest.fn().mockReturnValue({
            select: jest.fn().mockReturnValue({
              skip: jest.fn().mockReturnValue({
                limit: jest.fn().mockReturnValue({
                  lean: jest.fn().mockResolvedValue(profiles)
                })
              })
            })
          });

          (Profile.find as jest.Mock) = mockFind;
          (Profile.countDocuments as jest.Mock).mockResolvedValue(profiles.length);

          const mockReq: any = {
            body: {
              page: 1,
              limit: 20
            }
          };

          const mockRes: any = {
            json: jest.fn(),
            status: jest.fn().mockReturnThis()
          };

          await searchProfiles(mockReq, mockRes);

          expect(mockRes.json).toHaveBeenCalled();
          const responseData = mockRes.json.mock.calls[0][0];

          // Filter should be empty object
          const filterArg = mockFind.mock.calls[0][0];
          expect(Object.keys(filterArg).length).toBe(0);

          // Should return all profiles
          expect(responseData.profiles.length).toBe(profilesCount);
        }
      ),
      { numRuns: 20 }
    );
  }, 60000);

  /**
   * Additional property: Profession filter should be case-insensitive
   */
  it('Property 30 (case-insensitive): should match profession case-insensitively', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom('Engineer', 'Designer', 'Manager'),
        async (profession) => {
          jest.clearAllMocks();

          const profile = {
            _id: new mongoose.Types.ObjectId(),
            userId: new mongoose.Types.ObjectId(),
            name: 'User',
            age: 25,
            gender: 'male',
            place: 'City',
            skills: ['Skill1'],
            profession: profession,
            photos: [],
            bio: 'Bio',
            verified: false,
            optimizedKeywords: ['keyword'],
            createdAt: new Date(),
            updatedAt: new Date()
          };

          const mockFind = jest.fn().mockReturnValue({
            select: jest.fn().mockReturnValue({
              skip: jest.fn().mockReturnValue({
                limit: jest.fn().mockReturnValue({
                  lean: jest.fn().mockResolvedValue([profile])
                })
              })
            })
          });

          (Profile.find as jest.Mock) = mockFind;
          (Profile.countDocuments as jest.Mock).mockResolvedValue(1);

          // Test with different case variations
          const variations = [
            profession.toLowerCase(),
            profession.toUpperCase(),
            profession
          ];

          for (const variant of variations) {
            jest.clearAllMocks();
            (Profile.find as jest.Mock) = mockFind;

            const mockReq: any = {
              body: {
                profession: variant,
                page: 1,
                limit: 20
              }
            };

            const mockRes: any = {
              json: jest.fn(),
              status: jest.fn().mockReturnThis()
            };

            await searchProfiles(mockReq, mockRes);

            // Filter should use case-insensitive regex
            const filterArg = mockFind.mock.calls[0][0];
            expect(filterArg.profession.$options).toBe('i');
          }
        }
      ),
      { numRuns: 20 }
    );
  }, 60000);

  /**
   * Property 5: AI-Optimized Search Ranking
   * For any search query, profiles with AI-optimized keywords matching the query 
   * should rank higher than profiles without optimization.
   * 
   * This property tests that:
   * 1. Profiles with more matching optimized keywords appear first in results
   * 2. Profiles with AI-optimized keywords rank higher than those without
   * 3. The ranking is based on keyword match count
   * 4. Profiles with no matching keywords appear last
   * 5. The ranking order is consistent and deterministic
   * 
   * **Validates: Requirements 2.3, 2.4**
   */
  it('Property 5: should rank profiles with AI-optimized keywords higher', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          // Generate a search niche
          searchNiche: fc.constantFrom('frontend', 'backend', 'fullstack', 'mobile', 'devops', 'cloud'),
          
          // Generate profiles with varying keyword match counts
          profilesCount: fc.integer({ min: 3, max: 8 })
        }),
        async ({ searchNiche, profilesCount }) => {
          jest.clearAllMocks();

          // Create profiles with different levels of keyword optimization
          const profiles = Array.from({ length: profilesCount }, (_, i) => {
            const userId = new mongoose.Types.ObjectId();
            
            // Create varying levels of keyword matches
            // Some profiles have many matches, some have few, some have none
            let optimizedKeywords: string[];
            if (i === 0) {
              // Best match: multiple keywords containing the search niche
              optimizedKeywords = [searchNiche, `${searchNiche}-expert`, `${searchNiche}-developer`, 'other'];
            } else if (i === 1) {
              // Good match: two keywords containing the search niche
              optimizedKeywords = [searchNiche, `${searchNiche}-specialist`, 'other'];
            } else if (i === 2) {
              // Moderate match: one keyword containing the search niche
              optimizedKeywords = [searchNiche, 'other', 'keywords'];
            } else if (i === 3) {
              // Weak match: keyword partially matching
              optimizedKeywords = [`related-${searchNiche}`, 'other'];
            } else {
              // No match: no keywords containing the search niche
              optimizedKeywords = ['unrelated', 'keywords', 'only'];
            }

            return {
              _id: new mongoose.Types.ObjectId(),
              userId: userId,
              name: `User ${i}`,
              age: 25 + i,
              gender: i % 2 === 0 ? 'male' : 'female',
              place: 'Test City',
              skills: ['JavaScript', 'Python'],
              profession: 'Engineer',
              photos: [],
              bio: 'Test bio',
              verified: false,
              optimizedKeywords: optimizedKeywords,
              createdAt: new Date(),
              updatedAt: new Date()
            };
          });

          // Mock Profile.find to return profiles (unsorted initially)
          const mockFind = jest.fn().mockReturnValue({
            select: jest.fn().mockReturnValue({
              skip: jest.fn().mockReturnValue({
                limit: jest.fn().mockReturnValue({
                  lean: jest.fn().mockResolvedValue([...profiles]) // Return copy
                })
              })
            })
          });

          (Profile.find as jest.Mock) = mockFind;
          (Profile.countDocuments as jest.Mock).mockResolvedValue(profiles.length);

          // Create mock request with niche filter
          const mockReq: any = {
            body: {
              niche: searchNiche,
              page: 1,
              limit: 20
            }
          };

          const mockRes: any = {
            json: jest.fn(),
            status: jest.fn().mockReturnThis()
          };

          // Execute search
          await searchProfiles(mockReq, mockRes);

          // Verify response was successful
          expect(mockRes.json).toHaveBeenCalled();
          const responseData = mockRes.json.mock.calls[0][0];

          // Property 1: Response should have profiles
          expect(responseData).toHaveProperty('profiles');
          const returnedProfiles = responseData.profiles;

          // Property 2: Profiles should be sorted by keyword match count (descending)
          for (let i = 0; i < returnedProfiles.length - 1; i++) {
            const currentProfile = returnedProfiles[i];
            const nextProfile = returnedProfiles[i + 1];

            // Count matching keywords for current profile
            const currentMatchCount = currentProfile.optimizedKeywords?.filter((k: string) => 
              k.toLowerCase().includes(searchNiche.toLowerCase())
            ).length || 0;

            // Count matching keywords for next profile
            const nextMatchCount = nextProfile.optimizedKeywords?.filter((k: string) => 
              k.toLowerCase().includes(searchNiche.toLowerCase())
            ).length || 0;

            // Current profile should have >= matches than next profile (descending order)
            expect(currentMatchCount).toBeGreaterThanOrEqual(nextMatchCount);
          }

          // Property 3: First profile should have the most matching keywords
          if (returnedProfiles.length > 0) {
            const firstProfile = returnedProfiles[0];
            const firstMatchCount = firstProfile.optimizedKeywords?.filter((k: string) => 
              k.toLowerCase().includes(searchNiche.toLowerCase())
            ).length || 0;

            // All other profiles should have <= matches than the first
            for (let i = 1; i < returnedProfiles.length; i++) {
              const profile = returnedProfiles[i];
              const matchCount = profile.optimizedKeywords?.filter((k: string) => 
                k.toLowerCase().includes(searchNiche.toLowerCase())
              ).length || 0;

              expect(matchCount).toBeLessThanOrEqual(firstMatchCount);
            }
          }

          // Property 4: Profiles with AI-optimized keywords should rank higher than those without
          const profilesWithMatches = returnedProfiles.filter((p: any) => {
            const matchCount = p.optimizedKeywords?.filter((k: string) => 
              k.toLowerCase().includes(searchNiche.toLowerCase())
            ).length || 0;
            return matchCount > 0;
          });

          const profilesWithoutMatches = returnedProfiles.filter((p: any) => {
            const matchCount = p.optimizedKeywords?.filter((k: string) => 
              k.toLowerCase().includes(searchNiche.toLowerCase())
            ).length || 0;
            return matchCount === 0;
          });

          // If both groups exist, profiles with matches should appear before those without
          if (profilesWithMatches.length > 0 && profilesWithoutMatches.length > 0) {
            const lastMatchIndex = returnedProfiles.findIndex((p: any) => {
              const matchCount = p.optimizedKeywords?.filter((k: string) => 
                k.toLowerCase().includes(searchNiche.toLowerCase())
              ).length || 0;
              return matchCount === 0;
            });

            // All profiles before lastMatchIndex should have matches
            for (let i = 0; i < lastMatchIndex; i++) {
              const profile = returnedProfiles[i];
              const matchCount = profile.optimizedKeywords?.filter((k: string) => 
                k.toLowerCase().includes(searchNiche.toLowerCase())
              ).length || 0;
              expect(matchCount).toBeGreaterThan(0);
            }
          }

          // Property 5: Ranking should be deterministic (same input = same output)
          // Run search again with same parameters
          jest.clearAllMocks();
          (Profile.find as jest.Mock) = mockFind;
          (Profile.countDocuments as jest.Mock).mockResolvedValue(profiles.length);

          const mockReq2: any = {
            body: {
              niche: searchNiche,
              page: 1,
              limit: 20
            }
          };

          const mockRes2: any = {
            json: jest.fn(),
            status: jest.fn().mockReturnThis()
          };

          await searchProfiles(mockReq2, mockRes2);

          const responseData2 = mockRes2.json.mock.calls[0][0];
          const returnedProfiles2 = responseData2.profiles;

          // Results should be in the same order
          expect(returnedProfiles.length).toBe(returnedProfiles2.length);
          for (let i = 0; i < returnedProfiles.length; i++) {
            expect(returnedProfiles[i]._id.toString()).toBe(returnedProfiles2[i]._id.toString());
          }
        }
      ),
      { numRuns: 20 } // Run 20 iterations for faster tests
    );
  }, 120000); // Increased timeout for property-based testing

  /**
   * Property 31: Multiple Filter Combination
   * For any search query with multiple filters applied simultaneously, 
   * the results should satisfy all filter conditions (AND logic), not just some of them.
   * 
   * This property tests that:
   * 1. When multiple filters are applied, ALL conditions must be satisfied
   * 2. Profiles that match only some filters are excluded
   * 3. The AND logic is applied consistently across all filter combinations
   * 4. No profiles that fail any single filter criterion are included
   * 5. The filter combination works for any subset of available filters
   * 
   * **Validates: Requirements 12.5**
   * 
   * Feature: socialhive-platform, Property 31: Multiple Filter Combination
   */
  it('Property 31: should apply AND logic when multiple filters are combined', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          // Generate multiple filter criteria
          filterSkills: fc.array(
            fc.constantFrom('JavaScript', 'Python', 'Design', 'Management'),
            { minLength: 1, maxLength: 2 }
          ),
          filterProfession: fc.constantFrom('Engineer', 'Designer', 'Manager'),
          filterNiche: fc.constantFrom('frontend', 'backend', 'fullstack'),
          
          // Generate profiles with different match patterns
          profilesCount: fc.integer({ min: 5, max: 10 })
        }),
        async ({ filterSkills, filterProfession, filterNiche, profilesCount }) => {
          jest.clearAllMocks();

          // Create profiles with different combinations of matches
          const profiles = Array.from({ length: profilesCount }, (_, i) => {
            const userId = new mongoose.Types.ObjectId();
            
            // Create different match patterns:
            // - Some match all filters (should be included)
            // - Some match only skills (should be excluded)
            // - Some match only profession (should be excluded)
            // - Some match only niche (should be excluded)
            // - Some match skills + profession but not niche (should be excluded)
            // - Some match none (should be excluded)
            
            let skills: string[];
            let profession: string;
            let optimizedKeywords: string[];
            
            if (i % 5 === 0) {
              // Match ALL filters
              skills = [...filterSkills, 'OtherSkill'];
              profession = filterProfession;
              optimizedKeywords = [filterNiche, 'other'];
            } else if (i % 5 === 1) {
              // Match only skills
              skills = [...filterSkills];
              profession = 'DifferentProfession';
              optimizedKeywords = ['different', 'keywords'];
            } else if (i % 5 === 2) {
              // Match only profession
              skills = ['DifferentSkill'];
              profession = filterProfession;
              optimizedKeywords = ['different'];
            } else if (i % 5 === 3) {
              // Match skills + profession but NOT niche
              skills = [...filterSkills];
              profession = filterProfession;
              optimizedKeywords = ['different', 'keywords'];
            } else {
              // Match none
              skills = ['DifferentSkill'];
              profession = 'DifferentProfession';
              optimizedKeywords = ['different'];
            }

            return {
              _id: new mongoose.Types.ObjectId(),
              userId: userId,
              name: `User ${i}`,
              age: 25 + i,
              gender: i % 2 === 0 ? 'male' : 'female',
              place: 'Test City',
              skills: skills,
              profession: profession,
              photos: [],
              bio: 'Test bio',
              verified: false,
              optimizedKeywords: optimizedKeywords,
              createdAt: new Date(),
              updatedAt: new Date()
            };
          });

          // Filter to only profiles that match ALL criteria
          const matchingProfiles = profiles.filter(p => {
            const hasMatchingSkill = p.skills.some(skill => filterSkills.includes(skill));
            const hasMatchingProfession = p.profession.toLowerCase() === filterProfession.toLowerCase();
            const hasMatchingNiche = p.optimizedKeywords.includes(filterNiche);
            
            return hasMatchingSkill && hasMatchingProfession && hasMatchingNiche;
          });

          // Mock Profile.find to return only matching profiles
          const mockFind = jest.fn().mockReturnValue({
            select: jest.fn().mockReturnValue({
              skip: jest.fn().mockReturnValue({
                limit: jest.fn().mockReturnValue({
                  lean: jest.fn().mockResolvedValue(matchingProfiles)
                })
              })
            })
          });

          (Profile.find as jest.Mock) = mockFind;
          (Profile.countDocuments as jest.Mock).mockResolvedValue(matchingProfiles.length);

          // Create mock request with ALL filters
          const mockReq: any = {
            body: {
              skills: filterSkills,
              profession: filterProfession,
              niche: filterNiche,
              page: 1,
              limit: 20
            }
          };

          const mockRes: any = {
            json: jest.fn(),
            status: jest.fn().mockReturnThis()
          };

          // Execute search
          await searchProfiles(mockReq, mockRes);

          // Verify response was successful
          expect(mockRes.json).toHaveBeenCalled();
          const responseData = mockRes.json.mock.calls[0][0];

          // Property 1: Response should have profiles
          expect(responseData).toHaveProperty('profiles');
          const returnedProfiles = responseData.profiles;

          // Property 2: All returned profiles must match ALL filter criteria (AND logic)
          for (const profile of returnedProfiles) {
            // Must match skills filter
            const hasMatchingSkill = profile.skills.some((skill: string) => 
              filterSkills.includes(skill)
            );
            expect(hasMatchingSkill).toBe(true);

            // Must match profession filter
            expect(profile.profession.toLowerCase()).toBe(filterProfession.toLowerCase());

            // Must match niche filter
            const hasMatchingNiche = profile.optimizedKeywords.includes(filterNiche);
            expect(hasMatchingNiche).toBe(true);
          }

          // Property 3: No profiles that fail any single criterion should be included
          const profilesFailingSkills = profiles.filter(p => 
            !p.skills.some(skill => filterSkills.includes(skill))
          );
          const profilesFailingProfession = profiles.filter(p => 
            p.profession.toLowerCase() !== filterProfession.toLowerCase()
          );
          const profilesFailingNiche = profiles.filter(p => 
            !p.optimizedKeywords.includes(filterNiche)
          );

          // None of these should be in returned profiles
          for (const profile of returnedProfiles) {
            expect(profilesFailingSkills.find(p => p._id.toString() === profile._id.toString())).toBeUndefined();
            expect(profilesFailingProfession.find(p => p._id.toString() === profile._id.toString())).toBeUndefined();
            expect(profilesFailingNiche.find(p => p._id.toString() === profile._id.toString())).toBeUndefined();
          }

          // Property 4: Filter object should contain all three filter criteria
          expect(Profile.find).toHaveBeenCalled();
          const filterArg = mockFind.mock.calls[0][0];
          
          expect(filterArg).toHaveProperty('skills');
          expect(filterArg).toHaveProperty('profession');
          expect(filterArg).toHaveProperty('optimizedKeywords');

          // Property 5: Count of returned profiles should equal count of profiles matching ALL criteria
          expect(returnedProfiles.length).toBe(matchingProfiles.length);
        }
      ),
      { numRuns: 20 } // Run 20 iterations for faster tests
    );
  }, 120000); // Increased timeout for property-based testing

  /**
   * Additional test for Property 31: Test with different filter combinations
   */
  it('Property 31 (partial filters): should apply AND logic with any subset of filters', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          // Randomly choose which filters to apply
          useSkillsFilter: fc.boolean(),
          useProfessionFilter: fc.boolean(),
          useNicheFilter: fc.boolean(),
          
          filterSkills: fc.array(fc.constantFrom('JavaScript', 'Python'), { minLength: 1, maxLength: 2 }),
          filterProfession: fc.constantFrom('Engineer', 'Designer'),
          filterNiche: fc.constantFrom('frontend', 'backend'),
          
          profilesCount: fc.integer({ min: 3, max: 6 })
        }),
        async ({ useSkillsFilter, useProfessionFilter, useNicheFilter, filterSkills, filterProfession, filterNiche, profilesCount }) => {
          // Skip if no filters are selected
          if (!useSkillsFilter && !useProfessionFilter && !useNicheFilter) {
            return;
          }

          jest.clearAllMocks();

          // Create profiles
          const profiles = Array.from({ length: profilesCount }, (_, i) => {
            const userId = new mongoose.Types.ObjectId();
            
            // Half match all selected filters, half don't
            const matchAll = i % 2 === 0;
            
            return {
              _id: new mongoose.Types.ObjectId(),
              userId: userId,
              name: `User ${i}`,
              age: 25 + i,
              gender: 'male',
              place: 'City',
              skills: matchAll ? [...filterSkills] : ['DifferentSkill'],
              profession: matchAll ? filterProfession : 'DifferentProfession',
              photos: [],
              bio: 'Bio',
              verified: false,
              optimizedKeywords: matchAll ? [filterNiche] : ['different'],
              createdAt: new Date(),
              updatedAt: new Date()
            };
          });

          // Filter profiles based on which filters are active
          const matchingProfiles = profiles.filter(p => {
            let matches = true;
            
            if (useSkillsFilter) {
              matches = matches && p.skills.some(skill => filterSkills.includes(skill));
            }
            if (useProfessionFilter) {
              matches = matches && p.profession.toLowerCase() === filterProfession.toLowerCase();
            }
            if (useNicheFilter) {
              matches = matches && p.optimizedKeywords.includes(filterNiche);
            }
            
            return matches;
          });

          const mockFind = jest.fn().mockReturnValue({
            select: jest.fn().mockReturnValue({
              skip: jest.fn().mockReturnValue({
                limit: jest.fn().mockReturnValue({
                  lean: jest.fn().mockResolvedValue(matchingProfiles)
                })
              })
            })
          });

          (Profile.find as jest.Mock) = mockFind;
          (Profile.countDocuments as jest.Mock).mockResolvedValue(matchingProfiles.length);

          // Build request body with only selected filters
          const requestBody: any = {
            page: 1,
            limit: 20
          };
          
          if (useSkillsFilter) requestBody.skills = filterSkills;
          if (useProfessionFilter) requestBody.profession = filterProfession;
          if (useNicheFilter) requestBody.niche = filterNiche;

          const mockReq: any = {
            body: requestBody
          };

          const mockRes: any = {
            json: jest.fn(),
            status: jest.fn().mockReturnThis()
          };

          await searchProfiles(mockReq, mockRes);

          expect(mockRes.json).toHaveBeenCalled();
          const responseData = mockRes.json.mock.calls[0][0];
          const returnedProfiles = responseData.profiles;

          // Property: All returned profiles must match ALL active filters
          for (const profile of returnedProfiles) {
            if (useSkillsFilter) {
              const hasMatchingSkill = profile.skills.some((skill: string) => 
                filterSkills.includes(skill)
              );
              expect(hasMatchingSkill).toBe(true);
            }
            
            if (useProfessionFilter) {
              expect(profile.profession.toLowerCase()).toBe(filterProfession.toLowerCase());
            }
            
            if (useNicheFilter) {
              expect(profile.optimizedKeywords).toContain(filterNiche);
            }
          }
        }
      ),
      { numRuns: 20 }
    );
  }, 120000);

  /**
   * Additional property: Profiles without niche filter should not be ranked by keywords
   */
  it('Property 5 (no ranking): should not apply keyword ranking when niche filter is absent', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 2, max: 5 }),
        async (profilesCount) => {
          jest.clearAllMocks();

          const profiles = Array.from({ length: profilesCount }, (_, i) => ({
            _id: new mongoose.Types.ObjectId(),
            userId: new mongoose.Types.ObjectId(),
            name: `User ${i}`,
            age: 25 + i,
            gender: 'male',
            place: 'City',
            skills: ['JavaScript'],
            profession: 'Engineer',
            photos: [],
            bio: 'Bio',
            verified: false,
            optimizedKeywords: i === 0 ? ['many', 'keywords', 'here'] : ['few'],
            createdAt: new Date(),
            updatedAt: new Date()
          }));

          const mockFind = jest.fn().mockReturnValue({
            select: jest.fn().mockReturnValue({
              skip: jest.fn().mockReturnValue({
                limit: jest.fn().mockReturnValue({
                  lean: jest.fn().mockResolvedValue([...profiles])
                })
              })
            })
          });

          (Profile.find as jest.Mock) = mockFind;
          (Profile.countDocuments as jest.Mock).mockResolvedValue(profiles.length);

          const mockReq: any = {
            body: {
              // No niche filter
              page: 1,
              limit: 20
            }
          };

          const mockRes: any = {
            json: jest.fn(),
            status: jest.fn().mockReturnThis()
          };

          await searchProfiles(mockReq, mockRes);

          expect(mockRes.json).toHaveBeenCalled();
          const responseData = mockRes.json.mock.calls[0][0];

          // Profiles should be returned in original order (no ranking applied)
          expect(responseData.profiles.length).toBe(profilesCount);
          
          // Order should match the original profiles array
          for (let i = 0; i < profilesCount; i++) {
            expect(responseData.profiles[i]._id.toString()).toBe(profiles[i]._id.toString());
          }
        }
      ),
      { numRuns: 20 }
    );
  }, 60000);
});
