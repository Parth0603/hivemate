import * as fc from 'fast-check';
import mongoose from 'mongoose';
import Profile from '../models/Profile';
import Friendship from '../models/Friendship';
import { getProfile } from './profileController';
import { CacheService } from '../services/cacheService';

/**
 * Property-Based Tests for Profile Preview Privacy
 * Feature: socialhive-platform
 * - Property 11: Profile Preview Privacy (Validates: Requirements 4.7, 18.1)
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
jest.mock('../models/Friendship');

// Mock the CacheService
jest.mock('../services/cacheService', () => ({
  CacheService: {
    getProfile: jest.fn(),
    setProfile: jest.fn(),
    getFriendship: jest.fn(),
    setFriendship: jest.fn(),
    invalidateProfile: jest.fn()
  }
}));

describe('Profile Preview Privacy - Property-Based Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Default cache behavior: return null (cache miss)
    (CacheService.getProfile as jest.Mock).mockResolvedValue(null);
    (CacheService.getFriendship as jest.Mock).mockResolvedValue(null);
    (CacheService.setProfile as jest.Mock).mockResolvedValue(undefined);
    (CacheService.setFriendship as jest.Mock).mockResolvedValue(undefined);
  });

  /**
   * Property 11: Profile Preview Privacy
   * For any user viewing another user's profile without an established friendship, 
   * only the bio field should be visible, and all other fields (photos, achievements, 
   * contact info) should be hidden.
   * 
   * This property tests that:
   * 1. Non-friends can only see: name, profession, bio, verified status
   * 2. Non-friends cannot see: age, place, skills, photos, college, company, 
   *    websiteUrl, achievements, optimizedKeywords
   * 3. The accessLevel is set to 'preview' for non-friends
   * 4. The privacy rules are enforced consistently for all profile data
   */
  it('Property 11: should show only bio and basic info to non-friends', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate random profile data
        fc.record({
          // Visible fields (should be in preview)
          name: fc.string({ minLength: 3, maxLength: 30 }),
          profession: fc.constantFrom('Engineer', 'Designer', 'Manager', 'Developer', 'Analyst', 'Consultant'),
          bio: fc.string({ minLength: 10, maxLength: 200 }),
          verified: fc.boolean(),
          
          // Hidden fields (should NOT be in preview)
          age: fc.integer({ min: 18, max: 65 }),
          gender: fc.constantFrom('male', 'female', 'other'),
          place: fc.string({ minLength: 3, maxLength: 50 }),
          skills: fc.array(fc.constantFrom('JavaScript', 'Python', 'Design', 'Management', 'Marketing'), { minLength: 1, maxLength: 5 }),
          photos: fc.array(fc.webUrl(), { minLength: 1, maxLength: 5 }),
          college: fc.option(fc.string({ minLength: 3, maxLength: 50 }), { nil: undefined }),
          company: fc.option(fc.string({ minLength: 3, maxLength: 50 }), { nil: undefined }),
          websiteUrl: fc.option(fc.webUrl(), { nil: undefined }),
          achievements: fc.array(fc.string({ minLength: 10, maxLength: 100 }), { minLength: 0, maxLength: 5 }),
          optimizedKeywords: fc.array(fc.string({ minLength: 3, maxLength: 20 }), { minLength: 1, maxLength: 10 })
        }),
        async (profileData) => {
          // Reset all mocks for this iteration
          jest.clearAllMocks();

          // Generate unique IDs for viewer and profile owner
          const viewerId = new mongoose.Types.ObjectId();
          const profileOwnerId = new mongoose.Types.ObjectId();
          const profileId = new mongoose.Types.ObjectId();

          // Create complete profile with all fields
          const fullProfile = {
            _id: profileId,
            userId: profileOwnerId,
            name: profileData.name,
            age: profileData.age,
            gender: profileData.gender,
            place: profileData.place,
            skills: profileData.skills,
            profession: profileData.profession,
            photos: profileData.photos,
            bio: profileData.bio,
            college: profileData.college,
            company: profileData.company,
            verified: profileData.verified,
            websiteUrl: profileData.websiteUrl,
            achievements: profileData.achievements,
            optimizedKeywords: profileData.optimizedKeywords,
            createdAt: new Date(),
            updatedAt: new Date()
          };

          // Mock Profile.findOne to return the full profile
          (Profile.findOne as jest.Mock).mockImplementation(() => ({
            lean: jest.fn().mockResolvedValue(fullProfile)
          }));

          // Mock Friendship.findOne to return null (no friendship exists)
          (Friendship.findOne as jest.Mock).mockImplementation(() => ({
            lean: jest.fn().mockResolvedValue(null)
          }));

          // Create mock request and response
          const mockReq: any = {
            userId: viewerId.toString(),
            params: {
              userId: profileOwnerId.toString()
            }
          };

          const mockRes: any = {
            json: jest.fn(),
            status: jest.fn().mockReturnThis()
          };

          // Get profile as non-friend
          await getProfile(mockReq, mockRes);

          // Verify response was successful
          expect(mockRes.json).toHaveBeenCalled();
          const responseData = mockRes.json.mock.calls[0][0];

          // Property 1: Response should have profile and accessLevel
          expect(responseData).toHaveProperty('profile');
          expect(responseData).toHaveProperty('accessLevel');

          // Property 2: Access level should be 'preview' for non-friends
          expect(responseData.accessLevel).toBe('preview');

          const returnedProfile = responseData.profile;

          // Property 3: Visible fields should be present
          expect(returnedProfile).toHaveProperty('id');
          expect(returnedProfile).toHaveProperty('userId');
          expect(returnedProfile).toHaveProperty('name');
          expect(returnedProfile).toHaveProperty('profession');
          expect(returnedProfile).toHaveProperty('bio');
          expect(returnedProfile).toHaveProperty('verified');

          // Property 4: Visible fields should have correct values
          expect(returnedProfile.userId).toEqual(profileOwnerId);
          expect(returnedProfile.name).toBe(profileData.name);
          expect(returnedProfile.profession).toBe(profileData.profession);
          expect(returnedProfile.bio).toBe(profileData.bio);
          expect(returnedProfile.verified).toBe(profileData.verified);

          // Property 5: Hidden fields should NOT be present in preview
          expect(returnedProfile).not.toHaveProperty('age');
          expect(returnedProfile).not.toHaveProperty('gender');
          expect(returnedProfile).not.toHaveProperty('place');
          expect(returnedProfile).not.toHaveProperty('skills');
          expect(returnedProfile).not.toHaveProperty('photos');
          expect(returnedProfile).not.toHaveProperty('college');
          expect(returnedProfile).not.toHaveProperty('company');
          expect(returnedProfile).not.toHaveProperty('websiteUrl');
          expect(returnedProfile).not.toHaveProperty('achievements');
          expect(returnedProfile).not.toHaveProperty('optimizedKeywords');
          expect(returnedProfile).not.toHaveProperty('createdAt');
          expect(returnedProfile).not.toHaveProperty('updatedAt');

          // Property 6: Friendship query should have been made
          expect(Friendship.findOne).toHaveBeenCalled();
          const friendshipQuery = (Friendship.findOne as jest.Mock).mock.calls[0][0];
          
          // Verify the friendship query checks both directions
          expect(friendshipQuery.$or).toBeDefined();
          expect(friendshipQuery.$or).toHaveLength(2);
          expect(friendshipQuery.blocked).toBe(false);

          // Property 7: Cache should be checked and set
          expect(CacheService.getProfile).toHaveBeenCalledWith(profileOwnerId.toString());
          expect(CacheService.getFriendship).toHaveBeenCalledWith(viewerId.toString(), profileOwnerId.toString());
          expect(CacheService.setProfile).toHaveBeenCalled();
          expect(CacheService.setFriendship).toHaveBeenCalledWith(viewerId.toString(), profileOwnerId.toString(), false);
        }
      ),
      { numRuns: 100 } // Run 100 iterations as specified in design
    );
  }, 120000); // Increased timeout for property-based testing

  /**
   * Additional property: Own profile should show all fields
   */
  it('Property 11 (own profile): should show all fields when viewing own profile', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          name: fc.string({ minLength: 3, maxLength: 30 }),
          age: fc.integer({ min: 18, max: 65 }),
          gender: fc.constantFrom('male', 'female', 'other'),
          place: fc.string({ minLength: 3, maxLength: 50 }),
          skills: fc.array(fc.string({ minLength: 3, maxLength: 20 }), { minLength: 1, maxLength: 5 }),
          profession: fc.string({ minLength: 3, maxLength: 30 }),
          photos: fc.array(fc.webUrl(), { minLength: 1, maxLength: 5 }),
          bio: fc.string({ minLength: 10, maxLength: 200 }),
          verified: fc.boolean()
        }),
        async (profileData) => {
          jest.clearAllMocks();

          const userId = new mongoose.Types.ObjectId();
          const profileId = new mongoose.Types.ObjectId();

          const fullProfile = {
            _id: profileId,
            userId: userId,
            ...profileData,
            college: 'Test College',
            company: 'Test Company',
            websiteUrl: 'https://example.com',
            achievements: ['Achievement 1'],
            optimizedKeywords: ['keyword1'],
            createdAt: new Date(),
            updatedAt: new Date()
          };

          (Profile.findOne as jest.Mock).mockImplementation(() => ({
            lean: jest.fn().mockResolvedValue(fullProfile)
          }));

          const mockReq: any = {
            userId: userId.toString(),
            params: {
              userId: userId.toString()
            }
          };

          const mockRes: any = {
            json: jest.fn(),
            status: jest.fn().mockReturnThis()
          };

          await getProfile(mockReq, mockRes);

          const responseData = mockRes.json.mock.calls[0][0];

          // Should have 'own' access level
          expect(responseData.accessLevel).toBe('own');

          const returnedProfile = responseData.profile;

          // All fields should be present for own profile
          expect(returnedProfile).toHaveProperty('age');
          expect(returnedProfile).toHaveProperty('place');
          expect(returnedProfile).toHaveProperty('skills');
          expect(returnedProfile).toHaveProperty('photos');
          expect(returnedProfile).toHaveProperty('college');
          expect(returnedProfile).toHaveProperty('company');
          expect(returnedProfile).toHaveProperty('websiteUrl');
          expect(returnedProfile).toHaveProperty('achievements');

          // Friendship should NOT be queried for own profile
          expect(Friendship.findOne).not.toHaveBeenCalled();
        }
      ),
      { numRuns: 50 }
    );
  }, 60000);

  /**
   * Additional property: Friends should see all fields
   */
  it('Property 11 (friends): should show all fields to friends', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          name: fc.string({ minLength: 3, maxLength: 30 }),
          age: fc.integer({ min: 18, max: 65 }),
          gender: fc.constantFrom('male', 'female', 'other'),
          place: fc.string({ minLength: 3, maxLength: 50 }),
          skills: fc.array(fc.string({ minLength: 3, maxLength: 20 }), { minLength: 1, maxLength: 5 }),
          profession: fc.string({ minLength: 3, maxLength: 30 }),
          photos: fc.array(fc.webUrl(), { minLength: 1, maxLength: 5 }),
          bio: fc.string({ minLength: 10, maxLength: 200 }),
          verified: fc.boolean()
        }),
        async (profileData) => {
          jest.clearAllMocks();

          const viewerId = new mongoose.Types.ObjectId();
          const profileOwnerId = new mongoose.Types.ObjectId();
          const profileId = new mongoose.Types.ObjectId();

          const fullProfile = {
            _id: profileId,
            userId: profileOwnerId,
            ...profileData,
            college: 'Test College',
            company: 'Test Company',
            websiteUrl: 'https://example.com',
            achievements: ['Achievement 1'],
            optimizedKeywords: ['keyword1'],
            createdAt: new Date(),
            updatedAt: new Date()
          };

          (Profile.findOne as jest.Mock).mockImplementation(() => ({
            lean: jest.fn().mockResolvedValue(fullProfile)
          }));

          // Mock friendship exists
          (Friendship.findOne as jest.Mock).mockImplementation(() => ({
            lean: jest.fn().mockResolvedValue({
              _id: new mongoose.Types.ObjectId(),
              user1Id: viewerId,
              user2Id: profileOwnerId,
              establishedAt: new Date(),
              communicationLevel: 'chat',
              interactionCount: 0,
              blocked: false
            })
          }));

          const mockReq: any = {
            userId: viewerId.toString(),
            params: {
              userId: profileOwnerId.toString()
            }
          };

          const mockRes: any = {
            json: jest.fn(),
            status: jest.fn().mockReturnThis()
          };

          await getProfile(mockReq, mockRes);

          const responseData = mockRes.json.mock.calls[0][0];

          // Should have 'friend' access level
          expect(responseData.accessLevel).toBe('friend');

          const returnedProfile = responseData.profile;

          // All fields should be present for friends
          expect(returnedProfile).toHaveProperty('age');
          expect(returnedProfile).toHaveProperty('place');
          expect(returnedProfile).toHaveProperty('skills');
          expect(returnedProfile).toHaveProperty('photos');
          expect(returnedProfile).toHaveProperty('college');
          expect(returnedProfile).toHaveProperty('company');
          expect(returnedProfile).toHaveProperty('websiteUrl');
          expect(returnedProfile).toHaveProperty('achievements');

          // Values should match
          expect(returnedProfile.age).toBe(profileData.age);
          expect(returnedProfile.photos).toEqual(profileData.photos);
        }
      ),
      { numRuns: 50 }
    );
  }, 60000);

  /**
   * Property 15: Friendship Unlocks Full Profile
   * For any established friendship, both users should have access to each other's 
   * full profile including all photos, achievements, and contact information.
   * 
   * This property tests that:
   * 1. When a friendship exists, the accessLevel is 'friend'
   * 2. All profile fields are accessible to friends (age, place, skills, photos, 
   *    college, company, websiteUrl, achievements)
   * 3. The friendship unlocking is bidirectional (both users can see each other)
   * 4. All photos (up to 5) are visible to friends
   * 5. Optional fields (college, company, websiteUrl, achievements) are visible when present
   * 
   * **Validates: Requirements 5.5, 18.3**
   */
  it('Property 15: Friendship unlocks full profile access for both users', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate two complete profiles with all fields
        fc.record({
          user1Profile: fc.record({
            name: fc.string({ minLength: 3, maxLength: 30 }),
            age: fc.integer({ min: 18, max: 65 }),
            gender: fc.constantFrom('male', 'female', 'other'),
            place: fc.string({ minLength: 3, maxLength: 50 }),
            skills: fc.array(fc.constantFrom('JavaScript', 'Python', 'Design', 'Management', 'Marketing'), { minLength: 1, maxLength: 5 }),
            profession: fc.constantFrom('Engineer', 'Designer', 'Manager', 'Developer', 'Analyst'),
            photos: fc.array(fc.webUrl(), { minLength: 1, maxLength: 5 }),
            bio: fc.string({ minLength: 10, maxLength: 200 }),
            college: fc.option(fc.string({ minLength: 3, maxLength: 50 }), { nil: undefined }),
            company: fc.option(fc.string({ minLength: 3, maxLength: 50 }), { nil: undefined }),
            verified: fc.boolean(),
            websiteUrl: fc.option(fc.webUrl(), { nil: undefined }),
            achievements: fc.array(fc.string({ minLength: 10, maxLength: 100 }), { minLength: 0, maxLength: 5 })
          }),
          user2Profile: fc.record({
            name: fc.string({ minLength: 3, maxLength: 30 }),
            age: fc.integer({ min: 18, max: 65 }),
            gender: fc.constantFrom('male', 'female', 'other'),
            place: fc.string({ minLength: 3, maxLength: 50 }),
            skills: fc.array(fc.constantFrom('JavaScript', 'Python', 'Design', 'Management', 'Marketing'), { minLength: 1, maxLength: 5 }),
            profession: fc.constantFrom('Engineer', 'Designer', 'Manager', 'Developer', 'Analyst'),
            photos: fc.array(fc.webUrl(), { minLength: 1, maxLength: 5 }),
            bio: fc.string({ minLength: 10, maxLength: 200 }),
            college: fc.option(fc.string({ minLength: 3, maxLength: 50 }), { nil: undefined }),
            company: fc.option(fc.string({ minLength: 3, maxLength: 50 }), { nil: undefined }),
            verified: fc.boolean(),
            websiteUrl: fc.option(fc.webUrl(), { nil: undefined }),
            achievements: fc.array(fc.string({ minLength: 10, maxLength: 100 }), { minLength: 0, maxLength: 5 })
          })
        }),
        async ({ user1Profile, user2Profile }) => {
          jest.clearAllMocks();

          const user1Id = new mongoose.Types.ObjectId();
          const user2Id = new mongoose.Types.ObjectId();
          const profile1Id = new mongoose.Types.ObjectId();
          const profile2Id = new mongoose.Types.ObjectId();
          const friendshipId = new mongoose.Types.ObjectId();

          // Create complete profiles for both users
          const fullProfile1 = {
            _id: profile1Id,
            userId: user1Id,
            ...user1Profile,
            optimizedKeywords: ['keyword1', 'keyword2'],
            createdAt: new Date(),
            updatedAt: new Date()
          };

          const fullProfile2 = {
            _id: profile2Id,
            userId: user2Id,
            ...user2Profile,
            optimizedKeywords: ['keyword3', 'keyword4'],
            createdAt: new Date(),
            updatedAt: new Date()
          };

          // Create friendship between users
          const friendship = {
            _id: friendshipId,
            user1Id: user1Id,
            user2Id: user2Id,
            establishedAt: new Date(),
            communicationLevel: 'chat',
            interactionCount: 0,
            blocked: false
          };

          // Test 1: User1 viewing User2's profile
          (Profile.findOne as jest.Mock).mockImplementation(() => ({
            lean: jest.fn().mockResolvedValue(fullProfile2)
          }));

          (Friendship.findOne as jest.Mock).mockImplementation(() => ({
            lean: jest.fn().mockResolvedValue(friendship)
          }));

          const mockReq1: any = {
            userId: user1Id.toString(),
            params: {
              userId: user2Id.toString()
            }
          };

          const mockRes1: any = {
            json: jest.fn(),
            status: jest.fn().mockReturnThis()
          };

          await getProfile(mockReq1, mockRes1);

          expect(mockRes1.json).toHaveBeenCalled();
          const response1 = mockRes1.json.mock.calls[0][0];

          // Property 1: Access level should be 'friend'
          expect(response1.accessLevel).toBe('friend');

          const returnedProfile1 = response1.profile;

          // Property 2: All required fields should be present
          expect(returnedProfile1).toHaveProperty('id');
          expect(returnedProfile1).toHaveProperty('userId');
          expect(returnedProfile1).toHaveProperty('name');
          expect(returnedProfile1).toHaveProperty('age');
          expect(returnedProfile1).toHaveProperty('place');
          expect(returnedProfile1).toHaveProperty('skills');
          expect(returnedProfile1).toHaveProperty('profession');
          expect(returnedProfile1).toHaveProperty('photos');
          expect(returnedProfile1).toHaveProperty('bio');
          expect(returnedProfile1).toHaveProperty('verified');

          // Property 3: All values should match the original profile
          expect(returnedProfile1.userId).toEqual(user2Id);
          expect(returnedProfile1.name).toBe(user2Profile.name);
          expect(returnedProfile1.age).toBe(user2Profile.age);
          expect(returnedProfile1.place).toBe(user2Profile.place);
          expect(returnedProfile1.skills).toEqual(user2Profile.skills);
          expect(returnedProfile1.profession).toBe(user2Profile.profession);
          expect(returnedProfile1.photos).toEqual(user2Profile.photos);
          expect(returnedProfile1.bio).toBe(user2Profile.bio);
          expect(returnedProfile1.verified).toBe(user2Profile.verified);

          // Property 4: All photos should be accessible (up to 5)
          expect(returnedProfile1.photos).toBeDefined();
          expect(returnedProfile1.photos.length).toBe(user2Profile.photos.length);
          expect(returnedProfile1.photos.length).toBeLessThanOrEqual(5);

          // Property 5: Optional fields should be present when they exist
          if (user2Profile.college !== undefined) {
            expect(returnedProfile1).toHaveProperty('college');
            expect(returnedProfile1.college).toBe(user2Profile.college);
          }
          if (user2Profile.company !== undefined) {
            expect(returnedProfile1).toHaveProperty('company');
            expect(returnedProfile1.company).toBe(user2Profile.company);
          }
          if (user2Profile.websiteUrl !== undefined) {
            expect(returnedProfile1).toHaveProperty('websiteUrl');
            expect(returnedProfile1.websiteUrl).toBe(user2Profile.websiteUrl);
          }
          if (user2Profile.achievements && user2Profile.achievements.length > 0) {
            expect(returnedProfile1).toHaveProperty('achievements');
            expect(returnedProfile1.achievements).toEqual(user2Profile.achievements);
          }

          // Test 2: Bidirectional access - User2 viewing User1's profile
          jest.clearAllMocks();

          (Profile.findOne as jest.Mock).mockImplementation(() => ({
            lean: jest.fn().mockResolvedValue(fullProfile1)
          }));

          (Friendship.findOne as jest.Mock).mockImplementation(() => ({
            lean: jest.fn().mockResolvedValue(friendship)
          }));

          const mockReq2: any = {
            userId: user2Id.toString(),
            params: {
              userId: user1Id.toString()
            }
          };

          const mockRes2: any = {
            json: jest.fn(),
            status: jest.fn().mockReturnThis()
          };

          await getProfile(mockReq2, mockRes2);

          expect(mockRes2.json).toHaveBeenCalled();
          const response2 = mockRes2.json.mock.calls[0][0];

          // Property 6: Bidirectional access - User2 should also have 'friend' access
          expect(response2.accessLevel).toBe('friend');

          const returnedProfile2 = response2.profile;

          // Property 7: User2 should see all of User1's fields
          expect(returnedProfile2).toHaveProperty('age');
          expect(returnedProfile2).toHaveProperty('place');
          expect(returnedProfile2).toHaveProperty('skills');
          expect(returnedProfile2).toHaveProperty('photos');
          expect(returnedProfile2.age).toBe(user1Profile.age);
          expect(returnedProfile2.photos).toEqual(user1Profile.photos);

          // Property 8: Friendship query should check both directions
          expect(Friendship.findOne).toHaveBeenCalled();
          const friendshipQuery = (Friendship.findOne as jest.Mock).mock.calls[0][0];
          expect(friendshipQuery.$or).toBeDefined();
          expect(friendshipQuery.$or).toHaveLength(2);
          expect(friendshipQuery.blocked).toBe(false);

          // Property 9: Cache should be utilized
          expect(CacheService.getProfile).toHaveBeenCalled();
          expect(CacheService.getFriendship).toHaveBeenCalled();
        }
      ),
      { numRuns: 100 } // Run 100 iterations as specified in design
    );
  }, 120000); // Increased timeout for property-based testing

  /**
   * Additional property: Privacy should be maintained even with cache hits
   */
  it('Property 11 (cache): should maintain privacy rules with cached data', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          name: fc.string({ minLength: 3, maxLength: 30 }),
          profession: fc.string({ minLength: 3, maxLength: 30 }),
          bio: fc.string({ minLength: 10, maxLength: 200 }),
          age: fc.integer({ min: 18, max: 65 }),
          photos: fc.array(fc.webUrl(), { minLength: 1, maxLength: 5 })
        }),
        async (profileData) => {
          jest.clearAllMocks();

          const viewerId = new mongoose.Types.ObjectId();
          const profileOwnerId = new mongoose.Types.ObjectId();

          const cachedProfile = {
            _id: new mongoose.Types.ObjectId(),
            userId: profileOwnerId,
            name: profileData.name,
            age: profileData.age,
            gender: 'male',
            place: 'Test City',
            skills: ['skill1'],
            profession: profileData.profession,
            photos: profileData.photos,
            bio: profileData.bio,
            verified: true,
            optimizedKeywords: ['keyword1'],
            createdAt: new Date(),
            updatedAt: new Date()
          };

          // Return cached profile
          (CacheService.getProfile as jest.Mock).mockResolvedValue(cachedProfile);
          
          // Return cached friendship status (not friends)
          (CacheService.getFriendship as jest.Mock).mockResolvedValue(false);

          const mockReq: any = {
            userId: viewerId.toString(),
            params: {
              userId: profileOwnerId.toString()
            }
          };

          const mockRes: any = {
            json: jest.fn(),
            status: jest.fn().mockReturnThis()
          };

          await getProfile(mockReq, mockRes);

          const responseData = mockRes.json.mock.calls[0][0];

          // Should still enforce privacy with cached data
          expect(responseData.accessLevel).toBe('preview');

          const returnedProfile = responseData.profile;

          // Should only show preview fields
          expect(returnedProfile).toHaveProperty('name');
          expect(returnedProfile).toHaveProperty('bio');
          expect(returnedProfile).not.toHaveProperty('age');
          expect(returnedProfile).not.toHaveProperty('photos');
          expect(returnedProfile).not.toHaveProperty('skills');

          // Database should not be queried when cache hits
          expect(Profile.findOne).not.toHaveBeenCalled();
          expect(Friendship.findOne).not.toHaveBeenCalled();
        }
      ),
      { numRuns: 50 }
    );
  }, 60000);

  /**
   * Property 38: Photo Privacy Before Friendship
   * For any user viewing another user's profile without an established friendship, 
   * all photo URLs should be inaccessible or return authorization errors.
   * 
   * This property tests that:
   * 1. Non-friends cannot see any photo URLs in the profile response
   * 2. The photos field is completely absent from the preview response
   * 3. Even if photos exist in the database, they are not exposed to non-friends
   * 4. This privacy rule holds for any number of photos (1-5)
   * 5. The privacy rule is enforced consistently regardless of other profile data
   * 
   * **Validates: Requirements 18.2**
   */
  it('Property 38: should hide all photo URLs from non-friends', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate random profile data with photos
        fc.record({
          // Basic visible fields
          name: fc.string({ minLength: 3, maxLength: 30 }),
          profession: fc.constantFrom('Engineer', 'Designer', 'Manager', 'Developer', 'Analyst', 'Consultant'),
          bio: fc.string({ minLength: 10, maxLength: 200 }),
          verified: fc.boolean(),
          
          // Hidden fields including photos
          age: fc.integer({ min: 18, max: 65 }),
          gender: fc.constantFrom('male', 'female', 'other'),
          place: fc.string({ minLength: 3, maxLength: 50 }),
          skills: fc.array(fc.constantFrom('JavaScript', 'Python', 'Design', 'Management', 'Marketing'), { minLength: 1, maxLength: 5 }),
          photos: fc.array(fc.webUrl(), { minLength: 1, maxLength: 5 }), // 1-5 photos
          college: fc.option(fc.string({ minLength: 3, maxLength: 50 }), { nil: undefined }),
          company: fc.option(fc.string({ minLength: 3, maxLength: 50 }), { nil: undefined }),
          websiteUrl: fc.option(fc.webUrl(), { nil: undefined }),
          achievements: fc.array(fc.string({ minLength: 10, maxLength: 100 }), { minLength: 0, maxLength: 5 })
        }),
        async (profileData) => {
          // Reset all mocks for this iteration
          jest.clearAllMocks();

          // Generate unique IDs for viewer and profile owner
          const viewerId = new mongoose.Types.ObjectId();
          const profileOwnerId = new mongoose.Types.ObjectId();
          const profileId = new mongoose.Types.ObjectId();

          // Create complete profile with all fields including photos
          const fullProfile = {
            _id: profileId,
            userId: profileOwnerId,
            name: profileData.name,
            age: profileData.age,
            gender: profileData.gender,
            place: profileData.place,
            skills: profileData.skills,
            profession: profileData.profession,
            photos: profileData.photos, // Photos exist in database
            bio: profileData.bio,
            college: profileData.college,
            company: profileData.company,
            verified: profileData.verified,
            websiteUrl: profileData.websiteUrl,
            achievements: profileData.achievements,
            optimizedKeywords: ['keyword1', 'keyword2'],
            createdAt: new Date(),
            updatedAt: new Date()
          };

          // Mock Profile.findOne to return the full profile with photos
          (Profile.findOne as jest.Mock).mockImplementation(() => ({
            lean: jest.fn().mockResolvedValue(fullProfile)
          }));

          // Mock Friendship.findOne to return null (no friendship exists)
          (Friendship.findOne as jest.Mock).mockImplementation(() => ({
            lean: jest.fn().mockResolvedValue(null)
          }));

          // Create mock request and response
          const mockReq: any = {
            userId: viewerId.toString(),
            params: {
              userId: profileOwnerId.toString()
            }
          };

          const mockRes: any = {
            json: jest.fn(),
            status: jest.fn().mockReturnThis()
          };

          // Get profile as non-friend
          await getProfile(mockReq, mockRes);

          // Verify response was successful
          expect(mockRes.json).toHaveBeenCalled();
          const responseData = mockRes.json.mock.calls[0][0];

          // Property 1: Response should have profile and accessLevel
          expect(responseData).toHaveProperty('profile');
          expect(responseData).toHaveProperty('accessLevel');

          // Property 2: Access level should be 'preview' for non-friends
          expect(responseData.accessLevel).toBe('preview');

          const returnedProfile = responseData.profile;

          // Property 3: Photos field should NOT be present in the response
          expect(returnedProfile).not.toHaveProperty('photos');

          // Property 4: Verify that photos existed in the database but were filtered out
          expect(fullProfile.photos).toBeDefined();
          expect(fullProfile.photos.length).toBeGreaterThan(0);
          expect(fullProfile.photos.length).toBeLessThanOrEqual(5);

          // Property 5: Other hidden fields should also not be present
          expect(returnedProfile).not.toHaveProperty('age');
          expect(returnedProfile).not.toHaveProperty('place');
          expect(returnedProfile).not.toHaveProperty('skills');
          expect(returnedProfile).not.toHaveProperty('college');
          expect(returnedProfile).not.toHaveProperty('company');
          expect(returnedProfile).not.toHaveProperty('websiteUrl');
          expect(returnedProfile).not.toHaveProperty('achievements');

          // Property 6: Only preview fields should be present
          expect(returnedProfile).toHaveProperty('id');
          expect(returnedProfile).toHaveProperty('userId');
          expect(returnedProfile).toHaveProperty('name');
          expect(returnedProfile).toHaveProperty('profession');
          expect(returnedProfile).toHaveProperty('bio');
          expect(returnedProfile).toHaveProperty('verified');

          // Property 7: Preview fields should have correct values
          expect(returnedProfile.userId).toEqual(profileOwnerId);
          expect(returnedProfile.name).toBe(profileData.name);
          expect(returnedProfile.profession).toBe(profileData.profession);
          expect(returnedProfile.bio).toBe(profileData.bio);
          expect(returnedProfile.verified).toBe(profileData.verified);

          // Property 8: Friendship query should have been made to check access
          expect(Friendship.findOne).toHaveBeenCalled();
          const friendshipQuery = (Friendship.findOne as jest.Mock).mock.calls[0][0];
          expect(friendshipQuery.$or).toBeDefined();
          expect(friendshipQuery.$or).toHaveLength(2);
          expect(friendshipQuery.blocked).toBe(false);

          // Property 9: The response should not contain any photo URLs anywhere
          const responseString = JSON.stringify(responseData);
          profileData.photos.forEach((photoUrl: string) => {
            expect(responseString).not.toContain(photoUrl);
          });
        }
      ),
      { numRuns: 100 } // Run 100 iterations as specified in design
    );
  }, 120000); // Increased timeout for property-based testing

  /**
   * Additional property: Photo privacy with different photo counts
   */
  it('Property 38 (photo count): should hide photos regardless of count (1-5)', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate profiles with varying photo counts
        fc.integer({ min: 1, max: 5 }),
        async (photoCount) => {
          jest.clearAllMocks();

          const viewerId = new mongoose.Types.ObjectId();
          const profileOwnerId = new mongoose.Types.ObjectId();
          const profileId = new mongoose.Types.ObjectId();

          // Generate exactly photoCount photos
          const photos = Array.from({ length: photoCount }, (_, i) => 
            `https://example.com/photo${i}.jpg`
          );

          const fullProfile = {
            _id: profileId,
            userId: profileOwnerId,
            name: 'Test User',
            age: 25,
            gender: 'male',
            place: 'Test City',
            skills: ['skill1'],
            profession: 'Engineer',
            photos: photos,
            bio: 'Test bio',
            verified: true,
            optimizedKeywords: ['keyword1'],
            createdAt: new Date(),
            updatedAt: new Date()
          };

          (Profile.findOne as jest.Mock).mockImplementation(() => ({
            lean: jest.fn().mockResolvedValue(fullProfile)
          }));

          (Friendship.findOne as jest.Mock).mockImplementation(() => ({
            lean: jest.fn().mockResolvedValue(null)
          }));

          const mockReq: any = {
            userId: viewerId.toString(),
            params: {
              userId: profileOwnerId.toString()
            }
          };

          const mockRes: any = {
            json: jest.fn(),
            status: jest.fn().mockReturnThis()
          };

          await getProfile(mockReq, mockRes);

          const responseData = mockRes.json.mock.calls[0][0];
          const returnedProfile = responseData.profile;

          // Property: Photos should be hidden regardless of count
          expect(returnedProfile).not.toHaveProperty('photos');
          expect(responseData.accessLevel).toBe('preview');

          // Verify the profile had photos in the database
          expect(fullProfile.photos.length).toBe(photoCount);
        }
      ),
      { numRuns: 50 }
    );
  }, 60000);

  /**
   * Additional property: Photo privacy persists with cache
   */
  it('Property 38 (cache): should hide photos from cached profiles for non-friends', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(fc.webUrl(), { minLength: 1, maxLength: 5 }),
        async (photos) => {
          jest.clearAllMocks();

          const viewerId = new mongoose.Types.ObjectId();
          const profileOwnerId = new mongoose.Types.ObjectId();

          const cachedProfile = {
            _id: new mongoose.Types.ObjectId(),
            userId: profileOwnerId,
            name: 'Cached User',
            age: 30,
            gender: 'female',
            place: 'Cached City',
            skills: ['skill1', 'skill2'],
            profession: 'Designer',
            photos: photos, // Photos in cache
            bio: 'Cached bio',
            verified: true,
            optimizedKeywords: ['keyword1'],
            createdAt: new Date(),
            updatedAt: new Date()
          };

          // Return cached profile with photos
          (CacheService.getProfile as jest.Mock).mockResolvedValue(cachedProfile);
          
          // Return cached friendship status (not friends)
          (CacheService.getFriendship as jest.Mock).mockResolvedValue(false);

          const mockReq: any = {
            userId: viewerId.toString(),
            params: {
              userId: profileOwnerId.toString()
            }
          };

          const mockRes: any = {
            json: jest.fn(),
            status: jest.fn().mockReturnThis()
          };

          await getProfile(mockReq, mockRes);

          const responseData = mockRes.json.mock.calls[0][0];
          const returnedProfile = responseData.profile;

          // Property: Photos should be hidden even from cached data
          expect(returnedProfile).not.toHaveProperty('photos');
          expect(responseData.accessLevel).toBe('preview');

          // Verify photos existed in cache
          expect(cachedProfile.photos.length).toBeGreaterThan(0);

          // Verify no photo URLs leaked into response
          const responseString = JSON.stringify(responseData);
          photos.forEach((photoUrl: string) => {
            expect(responseString).not.toContain(photoUrl);
          });
        }
      ),
      { numRuns: 50 }
    );
  }, 60000);

  /**
   * Property 39: Photo Visibility After Friendship
   * For any established friendship, both users should be able to access all of 
   * each other's uploaded photos (up to 5 per user).
   * 
   * This property tests that:
   * 1. When a friendship exists, the photos field is present in the response
   * 2. All photo URLs (up to 5) are accessible to friends
   * 3. The photo array contains the exact same URLs as stored in the database
   * 4. Photo visibility is bidirectional (both friends can see each other's photos)
   * 5. The number of photos returned matches the number stored (1-5)
   * 6. Photo visibility works consistently regardless of other profile data
   * 
   * **Validates: Requirements 18.4**
   */
  it('Property 39: should show all photos to friends', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate two profiles with photos
        fc.record({
          user1Profile: fc.record({
            name: fc.string({ minLength: 3, maxLength: 30 }),
            age: fc.integer({ min: 18, max: 65 }),
            gender: fc.constantFrom('male', 'female', 'other'),
            place: fc.string({ minLength: 3, maxLength: 50 }),
            skills: fc.array(fc.constantFrom('JavaScript', 'Python', 'Design', 'Management', 'Marketing'), { minLength: 1, maxLength: 5 }),
            profession: fc.constantFrom('Engineer', 'Designer', 'Manager', 'Developer', 'Analyst'),
            photos: fc.array(fc.webUrl(), { minLength: 1, maxLength: 5 }), // 1-5 photos
            bio: fc.string({ minLength: 10, maxLength: 200 }),
            verified: fc.boolean()
          }),
          user2Profile: fc.record({
            name: fc.string({ minLength: 3, maxLength: 30 }),
            age: fc.integer({ min: 18, max: 65 }),
            gender: fc.constantFrom('male', 'female', 'other'),
            place: fc.string({ minLength: 3, maxLength: 50 }),
            skills: fc.array(fc.constantFrom('JavaScript', 'Python', 'Design', 'Management', 'Marketing'), { minLength: 1, maxLength: 5 }),
            profession: fc.constantFrom('Engineer', 'Designer', 'Manager', 'Developer', 'Analyst'),
            photos: fc.array(fc.webUrl(), { minLength: 1, maxLength: 5 }), // 1-5 photos
            bio: fc.string({ minLength: 10, maxLength: 200 }),
            verified: fc.boolean()
          })
        }),
        async ({ user1Profile, user2Profile }) => {
          jest.clearAllMocks();

          const user1Id = new mongoose.Types.ObjectId();
          const user2Id = new mongoose.Types.ObjectId();
          const profile1Id = new mongoose.Types.ObjectId();
          const profile2Id = new mongoose.Types.ObjectId();
          const friendshipId = new mongoose.Types.ObjectId();

          // Create complete profiles for both users with photos
          const fullProfile1 = {
            _id: profile1Id,
            userId: user1Id,
            ...user1Profile,
            college: 'Test College 1',
            company: 'Test Company 1',
            websiteUrl: 'https://example1.com',
            achievements: ['Achievement 1'],
            optimizedKeywords: ['keyword1', 'keyword2'],
            createdAt: new Date(),
            updatedAt: new Date()
          };

          const fullProfile2 = {
            _id: profile2Id,
            userId: user2Id,
            ...user2Profile,
            college: 'Test College 2',
            company: 'Test Company 2',
            websiteUrl: 'https://example2.com',
            achievements: ['Achievement 2'],
            optimizedKeywords: ['keyword3', 'keyword4'],
            createdAt: new Date(),
            updatedAt: new Date()
          };

          // Create friendship between users
          const friendship = {
            _id: friendshipId,
            user1Id: user1Id,
            user2Id: user2Id,
            establishedAt: new Date(),
            communicationLevel: 'chat',
            interactionCount: 0,
            blocked: false
          };

          // Test 1: User1 viewing User2's profile (should see all photos)
          (Profile.findOne as jest.Mock).mockImplementation(() => ({
            lean: jest.fn().mockResolvedValue(fullProfile2)
          }));

          (Friendship.findOne as jest.Mock).mockImplementation(() => ({
            lean: jest.fn().mockResolvedValue(friendship)
          }));

          const mockReq1: any = {
            userId: user1Id.toString(),
            params: {
              userId: user2Id.toString()
            }
          };

          const mockRes1: any = {
            json: jest.fn(),
            status: jest.fn().mockReturnThis()
          };

          await getProfile(mockReq1, mockRes1);

          expect(mockRes1.json).toHaveBeenCalled();
          const response1 = mockRes1.json.mock.calls[0][0];

          // Property 1: Access level should be 'friend'
          expect(response1.accessLevel).toBe('friend');

          const returnedProfile1 = response1.profile;

          // Property 2: Photos field should be present for friends
          expect(returnedProfile1).toHaveProperty('photos');

          // Property 3: All photo URLs should be accessible
          expect(returnedProfile1.photos).toBeDefined();
          expect(Array.isArray(returnedProfile1.photos)).toBe(true);

          // Property 4: The photo array should contain the exact same URLs
          expect(returnedProfile1.photos).toEqual(user2Profile.photos);

          // Property 5: The number of photos should match (1-5)
          expect(returnedProfile1.photos.length).toBe(user2Profile.photos.length);
          expect(returnedProfile1.photos.length).toBeGreaterThanOrEqual(1);
          expect(returnedProfile1.photos.length).toBeLessThanOrEqual(5);

          // Property 6: Each photo URL should be a valid string
          returnedProfile1.photos.forEach((photoUrl: string) => {
            expect(typeof photoUrl).toBe('string');
            expect(photoUrl.length).toBeGreaterThan(0);
          });

          // Property 7: All original photo URLs should be present in response
          user2Profile.photos.forEach((originalUrl: string) => {
            expect(returnedProfile1.photos).toContain(originalUrl);
          });

          // Test 2: Bidirectional access - User2 viewing User1's profile (should see all photos)
          jest.clearAllMocks();

          (Profile.findOne as jest.Mock).mockImplementation(() => ({
            lean: jest.fn().mockResolvedValue(fullProfile1)
          }));

          (Friendship.findOne as jest.Mock).mockImplementation(() => ({
            lean: jest.fn().mockResolvedValue(friendship)
          }));

          const mockReq2: any = {
            userId: user2Id.toString(),
            params: {
              userId: user1Id.toString()
            }
          };

          const mockRes2: any = {
            json: jest.fn(),
            status: jest.fn().mockReturnThis()
          };

          await getProfile(mockReq2, mockRes2);

          expect(mockRes2.json).toHaveBeenCalled();
          const response2 = mockRes2.json.mock.calls[0][0];

          // Property 8: Bidirectional access - User2 should also have 'friend' access
          expect(response2.accessLevel).toBe('friend');

          const returnedProfile2 = response2.profile;

          // Property 9: User2 should see all of User1's photos
          expect(returnedProfile2).toHaveProperty('photos');
          expect(returnedProfile2.photos).toEqual(user1Profile.photos);
          expect(returnedProfile2.photos.length).toBe(user1Profile.photos.length);

          // Property 10: Photo visibility is bidirectional
          expect(returnedProfile1.photos.length).toBeGreaterThan(0);
          expect(returnedProfile2.photos.length).toBeGreaterThan(0);

          // Property 11: Friendship query should check both directions
          expect(Friendship.findOne).toHaveBeenCalled();
          const friendshipQuery = (Friendship.findOne as jest.Mock).mock.calls[0][0];
          expect(friendshipQuery.$or).toBeDefined();
          expect(friendshipQuery.$or).toHaveLength(2);
          expect(friendshipQuery.blocked).toBe(false);
        }
      ),
      { numRuns: 100 } // Run 100 iterations as specified in design
    );
  }, 120000); // Increased timeout for property-based testing

  /**
   * Additional property: Photo visibility with different photo counts
   */
  it('Property 39 (photo count): should show all photos regardless of count (1-5)', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate profiles with varying photo counts
        fc.integer({ min: 1, max: 5 }),
        async (photoCount) => {
          jest.clearAllMocks();

          const viewerId = new mongoose.Types.ObjectId();
          const profileOwnerId = new mongoose.Types.ObjectId();
          const profileId = new mongoose.Types.ObjectId();
          const friendshipId = new mongoose.Types.ObjectId();

          // Generate exactly photoCount photos
          const photos = Array.from({ length: photoCount }, (_, i) => 
            `https://example.com/photo${i}.jpg`
          );

          const fullProfile = {
            _id: profileId,
            userId: profileOwnerId,
            name: 'Test User',
            age: 25,
            gender: 'male',
            place: 'Test City',
            skills: ['skill1'],
            profession: 'Engineer',
            photos: photos,
            bio: 'Test bio',
            verified: true,
            optimizedKeywords: ['keyword1'],
            createdAt: new Date(),
            updatedAt: new Date()
          };

          const friendship = {
            _id: friendshipId,
            user1Id: viewerId,
            user2Id: profileOwnerId,
            establishedAt: new Date(),
            communicationLevel: 'chat',
            interactionCount: 0,
            blocked: false
          };

          (Profile.findOne as jest.Mock).mockImplementation(() => ({
            lean: jest.fn().mockResolvedValue(fullProfile)
          }));

          (Friendship.findOne as jest.Mock).mockImplementation(() => ({
            lean: jest.fn().mockResolvedValue(friendship)
          }));

          const mockReq: any = {
            userId: viewerId.toString(),
            params: {
              userId: profileOwnerId.toString()
            }
          };

          const mockRes: any = {
            json: jest.fn(),
            status: jest.fn().mockReturnThis()
          };

          await getProfile(mockReq, mockRes);

          const responseData = mockRes.json.mock.calls[0][0];
          const returnedProfile = responseData.profile;

          // Property: All photos should be visible to friends regardless of count
          expect(returnedProfile).toHaveProperty('photos');
          expect(returnedProfile.photos).toEqual(photos);
          expect(returnedProfile.photos.length).toBe(photoCount);
          expect(responseData.accessLevel).toBe('friend');
        }
      ),
      { numRuns: 50 }
    );
  }, 60000);

  /**
   * Additional property: Photo visibility persists with cache
   */
  it('Property 39 (cache): should show photos from cached profiles for friends', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(fc.webUrl(), { minLength: 1, maxLength: 5 }),
        async (photos) => {
          jest.clearAllMocks();

          const viewerId = new mongoose.Types.ObjectId();
          const profileOwnerId = new mongoose.Types.ObjectId();

          const cachedProfile = {
            _id: new mongoose.Types.ObjectId(),
            userId: profileOwnerId,
            name: 'Cached User',
            age: 30,
            gender: 'female',
            place: 'Cached City',
            skills: ['skill1', 'skill2'],
            profession: 'Designer',
            photos: photos, // Photos in cache
            bio: 'Cached bio',
            verified: true,
            optimizedKeywords: ['keyword1'],
            createdAt: new Date(),
            updatedAt: new Date()
          };

          // Return cached profile with photos
          (CacheService.getProfile as jest.Mock).mockResolvedValue(cachedProfile);
          
          // Return cached friendship status (friends)
          (CacheService.getFriendship as jest.Mock).mockResolvedValue(true);

          const mockReq: any = {
            userId: viewerId.toString(),
            params: {
              userId: profileOwnerId.toString()
            }
          };

          const mockRes: any = {
            json: jest.fn(),
            status: jest.fn().mockReturnThis()
          };

          await getProfile(mockReq, mockRes);

          const responseData = mockRes.json.mock.calls[0][0];
          const returnedProfile = responseData.profile;

          // Property: Photos should be visible from cached data for friends
          expect(returnedProfile).toHaveProperty('photos');
          expect(returnedProfile.photos).toEqual(photos);
          expect(returnedProfile.photos.length).toBe(photos.length);
          expect(responseData.accessLevel).toBe('friend');

          // Verify all photo URLs are present in response
          photos.forEach((photoUrl: string) => {
            expect(returnedProfile.photos).toContain(photoUrl);
          });

          // Database should not be queried when cache hits
          expect(Profile.findOne).not.toHaveBeenCalled();
          expect(Friendship.findOne).not.toHaveBeenCalled();
        }
      ),
      { numRuns: 50 }
    );
  }, 60000);

  /**
   * Additional property: Photo visibility contrast between friends and non-friends
   */
  it('Property 39 (contrast): should show photos to friends but hide from non-friends', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(fc.webUrl(), { minLength: 1, maxLength: 5 }),
        async (photos) => {
          jest.clearAllMocks();

          const friendId = new mongoose.Types.ObjectId();
          const nonFriendId = new mongoose.Types.ObjectId();
          const profileOwnerId = new mongoose.Types.ObjectId();
          const profileId = new mongoose.Types.ObjectId();
          const friendshipId = new mongoose.Types.ObjectId();

          const fullProfile = {
            _id: profileId,
            userId: profileOwnerId,
            name: 'Profile Owner',
            age: 28,
            gender: 'male',
            place: 'Test City',
            skills: ['skill1'],
            profession: 'Engineer',
            photos: photos,
            bio: 'Test bio',
            verified: true,
            optimizedKeywords: ['keyword1'],
            createdAt: new Date(),
            updatedAt: new Date()
          };

          const friendship = {
            _id: friendshipId,
            user1Id: friendId,
            user2Id: profileOwnerId,
            establishedAt: new Date(),
            communicationLevel: 'chat',
            interactionCount: 0,
            blocked: false
          };

          // Test 1: Friend viewing profile (should see photos)
          (Profile.findOne as jest.Mock).mockImplementation(() => ({
            lean: jest.fn().mockResolvedValue(fullProfile)
          }));

          (Friendship.findOne as jest.Mock).mockImplementation(() => ({
            lean: jest.fn().mockResolvedValue(friendship)
          }));

          const mockReqFriend: any = {
            userId: friendId.toString(),
            params: {
              userId: profileOwnerId.toString()
            }
          };

          const mockResFriend: any = {
            json: jest.fn(),
            status: jest.fn().mockReturnThis()
          };

          await getProfile(mockReqFriend, mockResFriend);

          const responseFriend = mockResFriend.json.mock.calls[0][0];
          const profileForFriend = responseFriend.profile;

          // Property: Friend should see all photos
          expect(responseFriend.accessLevel).toBe('friend');
          expect(profileForFriend).toHaveProperty('photos');
          expect(profileForFriend.photos).toEqual(photos);

          // Test 2: Non-friend viewing same profile (should NOT see photos)
          jest.clearAllMocks();

          (Profile.findOne as jest.Mock).mockImplementation(() => ({
            lean: jest.fn().mockResolvedValue(fullProfile)
          }));

          (Friendship.findOne as jest.Mock).mockImplementation(() => ({
            lean: jest.fn().mockResolvedValue(null) // No friendship
          }));

          const mockReqNonFriend: any = {
            userId: nonFriendId.toString(),
            params: {
              userId: profileOwnerId.toString()
            }
          };

          const mockResNonFriend: any = {
            json: jest.fn(),
            status: jest.fn().mockReturnThis()
          };

          await getProfile(mockReqNonFriend, mockResNonFriend);

          const responseNonFriend = mockResNonFriend.json.mock.calls[0][0];
          const profileForNonFriend = responseNonFriend.profile;

          // Property: Non-friend should NOT see photos
          expect(responseNonFriend.accessLevel).toBe('preview');
          expect(profileForNonFriend).not.toHaveProperty('photos');

          // Property: Same profile, different access levels
          expect(fullProfile.photos).toEqual(photos);
          expect(profileForFriend.photos).toEqual(photos);
          expect(profileForNonFriend.photos).toBeUndefined();
        }
      ),
      { numRuns: 50 }
    );
  }, 60000);

  /**
   * Property 40: Privacy Persistence After Profile Updates
   * For any user who updates their profile information, the privacy rules 
   * (bio-only for non-friends, full access for friends) should remain enforced consistently.
   * 
   * This property tests that:
   * 1. After a profile update, non-friends still see only preview fields (name, profession, bio, verified)
   * 2. After a profile update, friends still see all fields including updated values
   * 3. Privacy rules persist regardless of which fields are updated
   * 4. Updated field values are correctly reflected in responses while maintaining privacy
   * 5. Cache invalidation doesn't break privacy enforcement
   * 6. Multiple sequential updates maintain consistent privacy rules
   * 
   * **Validates: Requirements 18.5**
   */
  it('Property 40: should maintain privacy rules after profile updates', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate initial profile data and update data
        fc.record({
          initialProfile: fc.record({
            name: fc.string({ minLength: 3, maxLength: 30 }),
            age: fc.integer({ min: 18, max: 65 }),
            gender: fc.constantFrom('male', 'female', 'other'),
            place: fc.string({ minLength: 3, maxLength: 50 }),
            skills: fc.array(fc.constantFrom('JavaScript', 'Python', 'Design', 'Management', 'Marketing'), { minLength: 1, maxLength: 5 }),
            profession: fc.constantFrom('Engineer', 'Designer', 'Manager', 'Developer', 'Analyst'),
            photos: fc.array(fc.webUrl(), { minLength: 1, maxLength: 5 }),
            bio: fc.string({ minLength: 10, maxLength: 200 }),
            college: fc.option(fc.string({ minLength: 3, maxLength: 50 }), { nil: undefined }),
            company: fc.option(fc.string({ minLength: 3, maxLength: 50 }), { nil: undefined }),
            verified: fc.boolean(),
            websiteUrl: fc.option(fc.webUrl(), { nil: undefined }),
            achievements: fc.array(fc.string({ minLength: 10, maxLength: 100 }), { minLength: 0, maxLength: 5 })
          }),
          updates: fc.record({
            name: fc.option(fc.string({ minLength: 3, maxLength: 30 }), { nil: undefined }),
            age: fc.option(fc.integer({ min: 18, max: 65 }), { nil: undefined }),
            place: fc.option(fc.string({ minLength: 3, maxLength: 50 }), { nil: undefined }),
            skills: fc.option(fc.array(fc.constantFrom('React', 'Node.js', 'UX', 'Leadership', 'Sales'), { minLength: 1, maxLength: 5 }), { nil: undefined }),
            profession: fc.option(fc.constantFrom('Senior Engineer', 'Lead Designer', 'Director', 'Architect', 'Consultant'), { nil: undefined }),
            bio: fc.option(fc.string({ minLength: 10, maxLength: 200 }), { nil: undefined }),
            college: fc.option(fc.string({ minLength: 3, maxLength: 50 }), { nil: undefined }),
            company: fc.option(fc.string({ minLength: 3, maxLength: 50 }), { nil: undefined }),
            websiteUrl: fc.option(fc.webUrl(), { nil: undefined }),
            achievements: fc.option(fc.array(fc.string({ minLength: 10, maxLength: 100 }), { minLength: 0, maxLength: 5 }), { nil: undefined })
          })
        }),
        async ({ initialProfile, updates }) => {
          jest.clearAllMocks();

          const profileOwnerId = new mongoose.Types.ObjectId();
          const friendId = new mongoose.Types.ObjectId();
          const nonFriendId = new mongoose.Types.ObjectId();
          const profileId = new mongoose.Types.ObjectId();
          const friendshipId = new mongoose.Types.ObjectId();

          // Create initial profile
          const initialFullProfile = {
            _id: profileId,
            userId: profileOwnerId,
            ...initialProfile,
            optimizedKeywords: ['keyword1', 'keyword2'],
            createdAt: new Date(),
            updatedAt: new Date()
          };

          // Apply updates to create updated profile
          const updatedFullProfile = {
            ...initialFullProfile,
            name: updates.name !== undefined ? updates.name : initialProfile.name,
            age: updates.age !== undefined ? updates.age : initialProfile.age,
            place: updates.place !== undefined ? updates.place : initialProfile.place,
            skills: updates.skills !== undefined ? updates.skills : initialProfile.skills,
            profession: updates.profession !== undefined ? updates.profession : initialProfile.profession,
            bio: updates.bio !== undefined ? updates.bio : initialProfile.bio,
            college: updates.college !== undefined ? updates.college : initialProfile.college,
            company: updates.company !== undefined ? updates.company : initialProfile.company,
            websiteUrl: updates.websiteUrl !== undefined ? updates.websiteUrl : initialProfile.websiteUrl,
            achievements: updates.achievements !== undefined ? updates.achievements : initialProfile.achievements,
            updatedAt: new Date()
          };

          // Create friendship
          const friendship = {
            _id: friendshipId,
            user1Id: friendId,
            user2Id: profileOwnerId,
            establishedAt: new Date(),
            communicationLevel: 'chat',
            interactionCount: 0,
            blocked: false
          };

          // Test 1: Non-friend viewing profile AFTER update
          (Profile.findOne as jest.Mock).mockImplementation(() => ({
            lean: jest.fn().mockResolvedValue(updatedFullProfile)
          }));

          (Friendship.findOne as jest.Mock).mockImplementation(() => ({
            lean: jest.fn().mockResolvedValue(null) // No friendship
          }));

          const mockReqNonFriend: any = {
            userId: nonFriendId.toString(),
            params: {
              userId: profileOwnerId.toString()
            }
          };

          const mockResNonFriend: any = {
            json: jest.fn(),
            status: jest.fn().mockReturnThis()
          };

          await getProfile(mockReqNonFriend, mockResNonFriend);

          expect(mockResNonFriend.json).toHaveBeenCalled();
          const responseNonFriend = mockResNonFriend.json.mock.calls[0][0];

          // Property 1: Access level should still be 'preview' after update
          expect(responseNonFriend.accessLevel).toBe('preview');

          const profileForNonFriend = responseNonFriend.profile;

          // Property 2: Non-friends should only see preview fields after update
          expect(profileForNonFriend).toHaveProperty('id');
          expect(profileForNonFriend).toHaveProperty('userId');
          expect(profileForNonFriend).toHaveProperty('name');
          expect(profileForNonFriend).toHaveProperty('profession');
          expect(profileForNonFriend).toHaveProperty('bio');
          expect(profileForNonFriend).toHaveProperty('verified');

          // Property 3: Updated values should be reflected in preview fields
          expect(profileForNonFriend.name).toBe(updatedFullProfile.name);
          expect(profileForNonFriend.profession).toBe(updatedFullProfile.profession);
          expect(profileForNonFriend.bio).toBe(updatedFullProfile.bio);
          expect(profileForNonFriend.verified).toBe(updatedFullProfile.verified);

          // Property 4: Hidden fields should NOT be present after update
          expect(profileForNonFriend).not.toHaveProperty('age');
          expect(profileForNonFriend).not.toHaveProperty('gender');
          expect(profileForNonFriend).not.toHaveProperty('place');
          expect(profileForNonFriend).not.toHaveProperty('skills');
          expect(profileForNonFriend).not.toHaveProperty('photos');
          expect(profileForNonFriend).not.toHaveProperty('college');
          expect(profileForNonFriend).not.toHaveProperty('company');
          expect(profileForNonFriend).not.toHaveProperty('websiteUrl');
          expect(profileForNonFriend).not.toHaveProperty('achievements');
          expect(profileForNonFriend).not.toHaveProperty('optimizedKeywords');
          expect(profileForNonFriend).not.toHaveProperty('createdAt');
          expect(profileForNonFriend).not.toHaveProperty('updatedAt');

          // Property 5: Updated hidden fields should remain hidden
          if (updates.age !== undefined) {
            expect(profileForNonFriend).not.toHaveProperty('age');
          }
          if (updates.skills !== undefined) {
            expect(profileForNonFriend).not.toHaveProperty('skills');
          }
          if (updates.place !== undefined) {
            expect(profileForNonFriend).not.toHaveProperty('place');
          }

          // Test 2: Friend viewing profile AFTER update
          jest.clearAllMocks();

          (Profile.findOne as jest.Mock).mockImplementation(() => ({
            lean: jest.fn().mockResolvedValue(updatedFullProfile)
          }));

          (Friendship.findOne as jest.Mock).mockImplementation(() => ({
            lean: jest.fn().mockResolvedValue(friendship)
          }));

          const mockReqFriend: any = {
            userId: friendId.toString(),
            params: {
              userId: profileOwnerId.toString()
            }
          };

          const mockResFriend: any = {
            json: jest.fn(),
            status: jest.fn().mockReturnThis()
          };

          await getProfile(mockReqFriend, mockResFriend);

          expect(mockResFriend.json).toHaveBeenCalled();
          const responseFriend = mockResFriend.json.mock.calls[0][0];

          // Property 6: Access level should still be 'friend' after update
          expect(responseFriend.accessLevel).toBe('friend');

          const profileForFriend = responseFriend.profile;

          // Property 7: Friends should see all fields after update
          expect(profileForFriend).toHaveProperty('id');
          expect(profileForFriend).toHaveProperty('userId');
          expect(profileForFriend).toHaveProperty('name');
          expect(profileForFriend).toHaveProperty('age');
          expect(profileForFriend).toHaveProperty('place');
          expect(profileForFriend).toHaveProperty('skills');
          expect(profileForFriend).toHaveProperty('profession');
          expect(profileForFriend).toHaveProperty('photos');
          expect(profileForFriend).toHaveProperty('bio');
          expect(profileForFriend).toHaveProperty('verified');

          // Property 8: All updated values should be reflected for friends
          expect(profileForFriend.name).toBe(updatedFullProfile.name);
          expect(profileForFriend.age).toBe(updatedFullProfile.age);
          expect(profileForFriend.place).toBe(updatedFullProfile.place);
          expect(profileForFriend.skills).toEqual(updatedFullProfile.skills);
          expect(profileForFriend.profession).toBe(updatedFullProfile.profession);
          expect(profileForFriend.photos).toEqual(updatedFullProfile.photos);
          expect(profileForFriend.bio).toBe(updatedFullProfile.bio);
          expect(profileForFriend.verified).toBe(updatedFullProfile.verified);

          // Property 9: Optional fields should be present when they exist
          if (updatedFullProfile.college !== undefined) {
            expect(profileForFriend).toHaveProperty('college');
            expect(profileForFriend.college).toBe(updatedFullProfile.college);
          }
          if (updatedFullProfile.company !== undefined) {
            expect(profileForFriend).toHaveProperty('company');
            expect(profileForFriend.company).toBe(updatedFullProfile.company);
          }
          if (updatedFullProfile.websiteUrl !== undefined) {
            expect(profileForFriend).toHaveProperty('websiteUrl');
            expect(profileForFriend.websiteUrl).toBe(updatedFullProfile.websiteUrl);
          }
          if (updatedFullProfile.achievements && updatedFullProfile.achievements.length > 0) {
            expect(profileForFriend).toHaveProperty('achievements');
            expect(profileForFriend.achievements).toEqual(updatedFullProfile.achievements);
          }

          // Property 10: Privacy rules are consistent - same profile, different access
          expect(profileForFriend.age).toBe(updatedFullProfile.age);
          expect(profileForNonFriend.age).toBeUndefined();
          expect(profileForFriend.photos).toEqual(updatedFullProfile.photos);
          expect(profileForNonFriend.photos).toBeUndefined();

          // Property 11: Friendship query should have been made for both requests
          expect(Friendship.findOne).toHaveBeenCalled();
        }
      ),
      { numRuns: 100 } // Run 100 iterations as specified in design
    );
  }, 120000); // Increased timeout for property-based testing

  /**
   * Additional property: Privacy persistence with multiple sequential updates
   */
  it('Property 40 (sequential): should maintain privacy after multiple updates', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate multiple update sequences
        fc.record({
          initialBio: fc.string({ minLength: 10, maxLength: 100 }),
          update1Bio: fc.string({ minLength: 10, maxLength: 100 }),
          update2Bio: fc.string({ minLength: 10, maxLength: 100 }),
          photos: fc.array(fc.webUrl(), { minLength: 1, maxLength: 5 })
        }),
        async ({ initialBio, update1Bio, update2Bio, photos }) => {
          jest.clearAllMocks();

          const profileOwnerId = new mongoose.Types.ObjectId();
          const nonFriendId = new mongoose.Types.ObjectId();
          const profileId = new mongoose.Types.ObjectId();

          // Simulate multiple updates
          const profileAfterUpdate2 = {
            _id: profileId,
            userId: profileOwnerId,
            name: 'Test User',
            age: 30,
            gender: 'male',
            place: 'Test City',
            skills: ['skill1', 'skill2'],
            profession: 'Engineer',
            photos: photos,
            bio: update2Bio, // After 2 updates
            verified: true,
            optimizedKeywords: ['keyword1'],
            createdAt: new Date(),
            updatedAt: new Date()
          };

          (Profile.findOne as jest.Mock).mockImplementation(() => ({
            lean: jest.fn().mockResolvedValue(profileAfterUpdate2)
          }));

          (Friendship.findOne as jest.Mock).mockImplementation(() => ({
            lean: jest.fn().mockResolvedValue(null)
          }));

          const mockReq: any = {
            userId: nonFriendId.toString(),
            params: {
              userId: profileOwnerId.toString()
            }
          };

          const mockRes: any = {
            json: jest.fn(),
            status: jest.fn().mockReturnThis()
          };

          await getProfile(mockReq, mockRes);

          const responseData = mockRes.json.mock.calls[0][0];
          const returnedProfile = responseData.profile;

          // Property: Privacy should persist after multiple updates
          expect(responseData.accessLevel).toBe('preview');
          expect(returnedProfile).toHaveProperty('bio');
          expect(returnedProfile.bio).toBe(update2Bio);
          expect(returnedProfile).not.toHaveProperty('photos');
          expect(returnedProfile).not.toHaveProperty('age');
          expect(returnedProfile).not.toHaveProperty('skills');
        }
      ),
      { numRuns: 50 }
    );
  }, 60000);

  /**
   * Additional property: Privacy persistence with cache invalidation
   */
  it('Property 40 (cache): should maintain privacy after cache invalidation', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          originalBio: fc.string({ minLength: 10, maxLength: 100 }),
          updatedBio: fc.string({ minLength: 10, maxLength: 100 }),
          photos: fc.array(fc.webUrl(), { minLength: 1, maxLength: 5 })
        }),
        async ({ originalBio, updatedBio, photos }) => {
          jest.clearAllMocks();

          const profileOwnerId = new mongoose.Types.ObjectId();
          const nonFriendId = new mongoose.Types.ObjectId();
          const profileId = new mongoose.Types.ObjectId();

          const updatedProfile = {
            _id: profileId,
            userId: profileOwnerId,
            name: 'Updated User',
            age: 28,
            gender: 'female',
            place: 'Updated City',
            skills: ['updated-skill'],
            profession: 'Updated Profession',
            photos: photos,
            bio: updatedBio,
            verified: true,
            optimizedKeywords: ['updated-keyword'],
            createdAt: new Date(),
            updatedAt: new Date()
          };

          // Simulate cache miss (cache was invalidated after update)
          (CacheService.getProfile as jest.Mock).mockResolvedValue(null);
          (CacheService.getFriendship as jest.Mock).mockResolvedValue(null);

          (Profile.findOne as jest.Mock).mockImplementation(() => ({
            lean: jest.fn().mockResolvedValue(updatedProfile)
          }));

          (Friendship.findOne as jest.Mock).mockImplementation(() => ({
            lean: jest.fn().mockResolvedValue(null)
          }));

          const mockReq: any = {
            userId: nonFriendId.toString(),
            params: {
              userId: profileOwnerId.toString()
            }
          };

          const mockRes: any = {
            json: jest.fn(),
            status: jest.fn().mockReturnThis()
          };

          await getProfile(mockReq, mockRes);

          const responseData = mockRes.json.mock.calls[0][0];
          const returnedProfile = responseData.profile;

          // Property: Privacy should be maintained even after cache invalidation
          expect(responseData.accessLevel).toBe('preview');
          expect(returnedProfile).toHaveProperty('bio');
          expect(returnedProfile.bio).toBe(updatedBio);
          expect(returnedProfile).not.toHaveProperty('photos');
          expect(returnedProfile).not.toHaveProperty('age');
          expect(returnedProfile).not.toHaveProperty('skills');

          // Verify cache was checked and set
          expect(CacheService.getProfile).toHaveBeenCalled();
          expect(CacheService.setProfile).toHaveBeenCalled();
        }
      ),
      { numRuns: 50 }
    );
  }, 60000);
});
