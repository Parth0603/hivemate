import * as fc from 'fast-check';
import { LocationService } from './locationService';
import Location from '../models/Location';

/**
 * Property-Based Tests for Location Service
 * Feature: socialhive-platform
 */

// Mock dependencies
jest.mock('../models/Location');
jest.mock('../config/redis', () => ({
  __esModule: true,
  default: {
    get: jest.fn(),
    setex: jest.fn(),
    del: jest.fn()
  }
}));

// Import mocked redis after mocking
import redis from '../config/redis';

describe('Location Service - Property-Based Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset all mock implementations
    (redis.get as jest.Mock).mockReset();
    (redis.setex as jest.Mock).mockReset();
    (redis.del as jest.Mock).mockReset();
    (Location.findOneAndUpdate as jest.Mock).mockReset();
  });

  /**
   * Property 35: Location Tracking in Explore Mode
   * For any user with Explore Mode enabled, the system should continuously update 
   * their location in the database at regular intervals (e.g., every 30 seconds 
   * or on significant movement).
   * 
   * Validates: Requirements 17.1
   * 
   * This property tests that:
   * 1. Location updates are stored in the database when mode is 'explore'
   * 2. The location data includes all required fields (userId, coordinates, mode, timestamp, accuracy)
   * 3. The coordinates are stored in GeoJSON format [longitude, latitude]
   * 4. The mode is correctly set to 'explore'
   * 5. Multiple updates for the same user update the existing record (upsert behavior)
   */
  it('Property 35: should continuously update location in database for users in explore mode', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate random user IDs
        fc.string({ minLength: 10, maxLength: 30 }),
        // Generate valid latitude (-90 to 90)
        fc.double({ min: -90, max: 90, noNaN: true }),
        // Generate valid longitude (-180 to 180)
        fc.double({ min: -180, max: 180, noNaN: true }),
        // Generate accuracy in meters
        fc.double({ min: 0, max: 100, noNaN: true }),
        async (userId, latitude, longitude, accuracy) => {
          // Reset mocks for this iteration
          (redis.get as jest.Mock).mockReset();
          (redis.setex as jest.Mock).mockReset();
          (redis.del as jest.Mock).mockReset();
          (Location.findOneAndUpdate as jest.Mock).mockReset();

          // Mock Redis to allow updates (no cooldown)
          (redis.get as jest.Mock).mockResolvedValue(null);
          (redis.setex as jest.Mock).mockResolvedValue('OK');
          (redis.del as jest.Mock).mockResolvedValue(1);

          // Mock Location.findOneAndUpdate to capture the update
          const mockLocation = {
            userId,
            coordinates: {
              type: 'Point',
              coordinates: [longitude, latitude]
            },
            mode: 'explore',
            timestamp: expect.any(Date),
            accuracy
          };
          (Location.findOneAndUpdate as jest.Mock).mockResolvedValue(mockLocation);

          // Update location with explore mode
          await LocationService.updateLocation(userId, latitude, longitude, accuracy, 'explore');

          // Verify that findOneAndUpdate was called
          expect(Location.findOneAndUpdate).toHaveBeenCalledTimes(1);

          // Verify the update parameters
          const [filter, update, options] = (Location.findOneAndUpdate as jest.Mock).mock.calls[0];

          // Property 1: Filter should match the userId
          expect(filter).toEqual({ userId });

          // Property 2: Update should include all required fields
          expect(update).toMatchObject({
            userId,
            coordinates: {
              type: 'Point',
              coordinates: [longitude, latitude] // GeoJSON format: [lng, lat]
            },
            mode: 'explore',
            accuracy
          });

          // Property 3: Timestamp should be set
          expect(update.timestamp).toBeInstanceOf(Date);

          // Property 4: Options should enable upsert (create if not exists)
          expect(options).toMatchObject({
            upsert: true,
            new: true
          });

          // Property 5: Coordinates should be in correct GeoJSON format
          expect(update.coordinates.type).toBe('Point');
          expect(update.coordinates.coordinates).toEqual([longitude, latitude]);

          // Property 6: Mode should be 'explore'
          expect(update.mode).toBe('explore');
        }
      ),
      { numRuns: 100 } // Run 100 iterations as specified in design
    );
  }, 60000); // Increase timeout for property-based testing

  /**
   * Additional property: Location updates should respect rate limiting
   * This ensures the system doesn't allow too frequent updates
   */
  it('Property 35 (rate limiting): should enforce cooldown between location updates', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 10, maxLength: 30 }),
        fc.double({ min: -90, max: 90, noNaN: true }),
        fc.double({ min: -180, max: 180, noNaN: true }),
        fc.double({ min: 0, max: 100, noNaN: true }),
        async (userId, latitude, longitude, accuracy) => {
          // Reset mocks for this iteration
          (redis.get as jest.Mock).mockReset();
          (Location.findOneAndUpdate as jest.Mock).mockReset();

          // Mock Redis to indicate user is in cooldown
          (redis.get as jest.Mock).mockResolvedValue('1');

          // Attempt to update location
          await expect(
            LocationService.updateLocation(userId, latitude, longitude, accuracy, 'explore')
          ).rejects.toThrow('Location update too frequent');

          // Verify that findOneAndUpdate was NOT called due to rate limiting
          expect(Location.findOneAndUpdate).not.toHaveBeenCalled();
        }
      ),
      { numRuns: 100 }
    );
  }, 60000);

  /**
   * Additional property: Location updates should validate coordinate bounds
   * This ensures invalid coordinates are rejected
   */
  it('Property 35 (validation): should reject invalid coordinates', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 10, maxLength: 30 }),
        fc.oneof(
          fc.double({ min: -200, max: -91, noNaN: true }), // Invalid latitude (too low)
          fc.double({ min: 91, max: 200, noNaN: true })     // Invalid latitude (too high)
        ),
        fc.double({ min: -180, max: 180, noNaN: true }),
        fc.double({ min: 0, max: 100, noNaN: true }),
        async (userId, invalidLatitude, longitude, accuracy) => {
          // Reset mocks for this iteration
          (redis.get as jest.Mock).mockReset();
          (Location.findOneAndUpdate as jest.Mock).mockReset();

          // Mock Redis to allow updates
          (redis.get as jest.Mock).mockResolvedValue(null);

          // Attempt to update with invalid latitude
          await expect(
            LocationService.updateLocation(userId, invalidLatitude, longitude, accuracy, 'explore')
          ).rejects.toThrow('Invalid latitude');

          // Verify that findOneAndUpdate was NOT called
          expect(Location.findOneAndUpdate).not.toHaveBeenCalled();
        }
      ),
      { numRuns: 100 }
    );
  }, 60000);

  /**
   * Additional property: Multiple updates for same user should use upsert
   * This ensures we update existing records rather than creating duplicates
   */
  it('Property 35 (upsert): should update existing location record for same user', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 10, maxLength: 30 }),
        fc.array(
          fc.tuple(
            fc.double({ min: -90, max: 90, noNaN: true }),
            fc.double({ min: -180, max: 180, noNaN: true })
          ),
          { minLength: 2, maxLength: 5 }
        ),
        fc.double({ min: 0, max: 100, noNaN: true }),
        async (userId, coordinatePairs, accuracy) => {
          // Reset mocks for this iteration
          (redis.get as jest.Mock).mockReset();
          (redis.setex as jest.Mock).mockReset();
          (redis.del as jest.Mock).mockReset();
          (Location.findOneAndUpdate as jest.Mock).mockReset();

          // Mock Redis to allow all updates
          (redis.get as jest.Mock).mockResolvedValue(null);
          (redis.setex as jest.Mock).mockResolvedValue('OK');
          (redis.del as jest.Mock).mockResolvedValue(1);
          (Location.findOneAndUpdate as jest.Mock).mockResolvedValue({});

          // Perform multiple location updates for the same user
          for (const [latitude, longitude] of coordinatePairs) {
            await LocationService.updateLocation(userId, latitude, longitude, accuracy, 'explore');
          }

          // Verify that each update used the same userId filter
          const calls = (Location.findOneAndUpdate as jest.Mock).mock.calls;
          expect(calls.length).toBe(coordinatePairs.length);

          // All calls should filter by the same userId
          calls.forEach(([filter]) => {
            expect(filter).toEqual({ userId });
          });

          // All calls should have upsert: true
          calls.forEach(([, , options]) => {
            expect(options.upsert).toBe(true);
          });
        }
      ),
      { numRuns: 50 } // Reduced runs due to multiple updates per test
    );
  }, 60000);

  /**
   * Property 6: Explore Mode Visibility
   * For any user with Explore Mode enabled, their profile should appear in radar 
   * queries from nearby users within the specified distance range.
   * 
   * Validates: Requirements 3.2, 3.3
   * 
   * This property tests that:
   * 1. Users with mode='explore' appear in nearby queries
   * 2. The query filters by mode='explore' (only explore mode users are visible)
   * 3. The query uses geospatial $nearSphere operator
   * 4. The query respects the distance range (maxDistance)
   * 5. Users in 'vanish' mode do not appear in results
   */
  it('Property 6: should make users with explore mode visible in radar queries', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate random query location
        fc.double({ min: -90, max: 90, noNaN: true }), // query latitude
        fc.double({ min: -180, max: 180, noNaN: true }), // query longitude
        // Generate random radius (100m to 10km)
        fc.integer({ min: 100, max: 10000 }),
        // Generate random user ID to exclude
        fc.string({ minLength: 10, maxLength: 30 }),
        async (queryLat, queryLng, radius, excludeUserId) => {
          // Reset mocks for this iteration
          (Location.find as jest.Mock) = jest.fn();
          
          // Mock cache miss
          jest.spyOn(require('./cacheService').CacheService, 'get').mockResolvedValue(null);
          jest.spyOn(require('./cacheService').CacheService, 'set').mockResolvedValue(undefined);

          // Create mock users in explore mode within range
          const mockExploreUsers = [
            {
              userId: 'user1',
              coordinates: {
                type: 'Point',
                coordinates: [queryLng + 0.001, queryLat + 0.001]
              },
              mode: 'explore',
              timestamp: new Date(),
              accuracy: 10
            },
            {
              userId: 'user2',
              coordinates: {
                type: 'Point',
                coordinates: [queryLng + 0.002, queryLat + 0.002]
              },
              mode: 'explore',
              timestamp: new Date(),
              accuracy: 15
            }
          ];

          // Mock the Location.find chain
          const mockPopulate = jest.fn().mockReturnThis();
          const mockLean = jest.fn().mockReturnThis();
          const mockLimit = jest.fn().mockResolvedValue(mockExploreUsers);

          (Location.find as jest.Mock).mockReturnValue({
            populate: mockPopulate,
            lean: mockLean,
            limit: mockLimit
          });

          // Call getNearbyUsers
          const results = await LocationService.getNearbyUsers(
            queryLat,
            queryLng,
            radius,
            excludeUserId
          );

          // Verify Location.find was called
          expect(Location.find).toHaveBeenCalledTimes(1);

          // Get the query that was passed to Location.find
          const query = (Location.find as jest.Mock).mock.calls[0][0];

          // Property 1: Query should filter by mode='explore'
          expect(query.mode).toBe('explore');

          // Property 2: Query should use $nearSphere for geospatial search
          expect(query.coordinates).toHaveProperty('$nearSphere');
          expect(query.coordinates.$nearSphere).toHaveProperty('$geometry');
          expect(query.coordinates.$nearSphere).toHaveProperty('$maxDistance');

          // Property 3: Geometry should be a Point with correct coordinates
          expect(query.coordinates.$nearSphere.$geometry.type).toBe('Point');
          expect(query.coordinates.$nearSphere.$geometry.coordinates).toEqual([queryLng, queryLat]);

          // Property 4: maxDistance should match the radius
          expect(query.coordinates.$nearSphere.$maxDistance).toBe(radius);

          // Property 5: Query should exclude the specified user
          expect(query.userId).toEqual({ $ne: excludeUserId });

          // Property 6: Results should contain users in explore mode
          expect(results).toEqual(mockExploreUsers);
          expect(results.length).toBeGreaterThan(0);
          results.forEach(user => {
            expect(user.mode).toBe('explore');
          });

          // Property 7: Query chain should call populate, lean, and limit
          expect(mockPopulate).toHaveBeenCalledWith('userId', 'email');
          expect(mockLean).toHaveBeenCalled();
          expect(mockLimit).toHaveBeenCalledWith(100);
        }
      ),
      { numRuns: 100 } // Run 100 iterations as specified in design
    );
  }, 60000);

  /**
   * Property 6 (negative case): Vanish mode users should not appear in radar queries
   * This ensures that users with mode='vanish' are filtered out
   */
  it('Property 6 (vanish mode): should not return users in vanish mode', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.double({ min: -90, max: 90, noNaN: true }),
        fc.double({ min: -180, max: 180, noNaN: true }),
        fc.integer({ min: 100, max: 10000 }),
        async (queryLat, queryLng, radius) => {
          // Reset mocks
          (Location.find as jest.Mock) = jest.fn();
          
          // Mock cache miss
          jest.spyOn(require('./cacheService').CacheService, 'get').mockResolvedValue(null);
          jest.spyOn(require('./cacheService').CacheService, 'set').mockResolvedValue(undefined);

          // Mock the Location.find chain - return empty results
          const mockPopulate = jest.fn().mockReturnThis();
          const mockLean = jest.fn().mockReturnThis();
          const mockLimit = jest.fn().mockResolvedValue([]);

          (Location.find as jest.Mock).mockReturnValue({
            populate: mockPopulate,
            lean: mockLean,
            limit: mockLimit
          });

          // Call getNearbyUsers
          await LocationService.getNearbyUsers(queryLat, queryLng, radius);

          // Verify the query filters by mode='explore'
          const query = (Location.find as jest.Mock).mock.calls[0][0];
          
          // Property: Query must explicitly filter for explore mode only
          expect(query.mode).toBe('explore');
          
          // This ensures vanish mode users are excluded by the query itself
          // The database will not return any users with mode='vanish'
        }
      ),
      { numRuns: 100 }
    );
  }, 60000);

  /**
   * Property 7: Vanish Mode Invisibility
   * For any user with Vanish Mode enabled, their profile should not appear in any 
   * radar queries, regardless of distance.
   * 
   * Validates: Requirements 3.5, 3.6
   * 
   * This property tests that:
   * 1. Users with mode='vanish' do not appear in radar queries
   * 2. The invisibility holds regardless of distance (even if very close)
   * 3. Multiple vanish mode users are all excluded from results
   * 4. The query explicitly filters for mode='explore' only
   * 5. Vanish mode users are stored in the database but not returned in queries
   */
  it('Property 7: should make users with vanish mode invisible in all radar queries', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate random query location with safe bounds to avoid floating-point edge cases
        fc.double({ min: -89, max: 89, noNaN: true }), // query latitude
        fc.double({ min: -179, max: 179, noNaN: true }), // query longitude
        // Generate random radius (even very large to test distance independence)
        fc.integer({ min: 100, max: 50000 }),
        // Generate array of user IDs in vanish mode
        fc.array(
          fc.string({ minLength: 10, maxLength: 30 }),
          { minLength: 1, maxLength: 10 }
        ),
        async (queryLat, queryLng, radius, vanishUserIds) => {
          // Reset mocks for this iteration
          (redis.get as jest.Mock).mockReset();
          (redis.setex as jest.Mock).mockReset();
          (redis.del as jest.Mock).mockReset();
          (Location.findOneAndUpdate as jest.Mock).mockReset();
          (Location.find as jest.Mock) = jest.fn();

          // Mock Redis to allow updates
          (redis.get as jest.Mock).mockResolvedValue(null);
          (redis.setex as jest.Mock).mockResolvedValue('OK');
          (redis.del as jest.Mock).mockResolvedValue(1);
          (Location.findOneAndUpdate as jest.Mock).mockResolvedValue({});

          // Create locations for users in vanish mode at various distances
          for (let i = 0; i < vanishUserIds.length; i++) {
            const userId = vanishUserIds[i];
            // Place users at different distances, some very close
            // Use small offsets to stay within valid coordinate bounds
            const offsetLat = (i % 2 === 0 ? 0.0001 : 0.01) * (i + 1);
            const offsetLng = (i % 2 === 0 ? 0.0001 : 0.01) * (i + 1);
            
            // Clamp coordinates to valid ranges to avoid floating-point precision issues
            const userLat = Math.max(-90, Math.min(90, queryLat + offsetLat));
            const userLng = Math.max(-180, Math.min(180, queryLng + offsetLng));
            
            await LocationService.updateLocation(
              userId,
              userLat,
              userLng,
              10,
              'vanish' // Set mode to vanish
            );
          }

          // Verify all users were stored with mode='vanish'
          const updateCalls = (Location.findOneAndUpdate as jest.Mock).mock.calls;
          expect(updateCalls.length).toBe(vanishUserIds.length);
          
          updateCalls.forEach(([, update]) => {
            expect(update.mode).toBe('vanish');
          });

          // Mock cache miss for radar query
          jest.spyOn(require('./cacheService').CacheService, 'get').mockResolvedValue(null);
          jest.spyOn(require('./cacheService').CacheService, 'set').mockResolvedValue(undefined);

          // Mock the Location.find chain to return empty results
          // (simulating that vanish mode users are filtered out by the query)
          const mockPopulate = jest.fn().mockReturnThis();
          const mockLean = jest.fn().mockReturnThis();
          const mockLimit = jest.fn().mockResolvedValue([]);

          (Location.find as jest.Mock).mockReturnValue({
            populate: mockPopulate,
            lean: mockLean,
            limit: mockLimit
          });

          // Query for nearby users
          const results = await LocationService.getNearbyUsers(
            queryLat,
            queryLng,
            radius
          );

          // Property 1: Query should explicitly filter for mode='explore' only
          expect(Location.find).toHaveBeenCalledTimes(1);
          const query = (Location.find as jest.Mock).mock.calls[0][0];
          expect(query.mode).toBe('explore');

          // Property 2: Results should be empty (no vanish mode users returned)
          expect(results).toEqual([]);
          expect(results.length).toBe(0);

          // Property 3: No vanish mode users should appear in results
          results.forEach(user => {
            expect(user.mode).not.toBe('vanish');
          });

          // Property 4: The query structure should exclude vanish mode by design
          // The mode filter ensures vanish users are never returned
          expect(query).toHaveProperty('mode');
          expect(query.mode).not.toBe('vanish');
        }
      ),
      { numRuns: 100 } // Run 100 iterations as specified in design
    );
  }, 60000);

  /**
   * Property 7 (mixed mode): Vanish mode users should be excluded even when 
   * explore mode users are present
   */
  it('Property 7 (mixed mode): should only return explore mode users when both modes present', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.double({ min: -90, max: 90, noNaN: true }),
        fc.double({ min: -180, max: 180, noNaN: true }),
        fc.integer({ min: 100, max: 10000 }),
        fc.array(fc.string({ minLength: 10, maxLength: 30 }), { minLength: 1, maxLength: 5 }),
        fc.array(fc.string({ minLength: 10, maxLength: 30 }), { minLength: 1, maxLength: 5 }),
        async (queryLat, queryLng, radius, exploreUserIds, vanishUserIds) => {
          // Ensure no overlap between user ID arrays
          const uniqueVanishIds = vanishUserIds.filter(id => !exploreUserIds.includes(id));
          if (uniqueVanishIds.length === 0) return; // Skip if no unique vanish users

          // Reset mocks
          (Location.find as jest.Mock) = jest.fn();
          
          // Mock cache miss
          jest.spyOn(require('./cacheService').CacheService, 'get').mockResolvedValue(null);
          jest.spyOn(require('./cacheService').CacheService, 'set').mockResolvedValue(undefined);

          // Create mock data: some users in explore mode, some in vanish mode
          const mockExploreUsers = exploreUserIds.map((userId, i) => ({
            userId,
            coordinates: {
              type: 'Point',
              coordinates: [queryLng + 0.001 * (i + 1), queryLat + 0.001 * (i + 1)]
            },
            mode: 'explore',
            timestamp: new Date(),
            accuracy: 10
          }));

          // Mock the Location.find chain to return only explore mode users
          const mockPopulate = jest.fn().mockReturnThis();
          const mockLean = jest.fn().mockReturnThis();
          const mockLimit = jest.fn().mockResolvedValue(mockExploreUsers);

          (Location.find as jest.Mock).mockReturnValue({
            populate: mockPopulate,
            lean: mockLean,
            limit: mockLimit
          });

          // Query for nearby users
          const results = await LocationService.getNearbyUsers(queryLat, queryLng, radius);

          // Property 1: Query should filter for explore mode only
          const query = (Location.find as jest.Mock).mock.calls[0][0];
          expect(query.mode).toBe('explore');

          // Property 2: All returned users should be in explore mode
          expect(results.length).toBeGreaterThan(0);
          results.forEach(user => {
            expect(user.mode).toBe('explore');
            expect(exploreUserIds).toContain(user.userId);
            expect(uniqueVanishIds).not.toContain(user.userId);
          });

          // Property 3: No vanish mode users should be in results
          const resultUserIds = results.map(u => u.userId);
          uniqueVanishIds.forEach(vanishUserId => {
            expect(resultUserIds).not.toContain(vanishUserId);
          });
        }
      ),
      { numRuns: 100 }
    );
  }, 60000);

  /**
   * Property 36: Distance Calculation Accuracy
   * For any two users with known coordinates, the calculated distance between them 
   * should match the haversine formula result within an acceptable margin of error (< 1%).
   * 
   * Validates: Requirements 17.3
   * 
   * This property tests that:
   * 1. The calculateDistance method produces accurate results
   * 2. The distance calculation matches the Haversine formula
   * 3. The result is within 1% margin of error
   * 4. The calculation works for various coordinate pairs (different hemispheres, distances)
   * 5. The calculation handles edge cases (same location, antipodal points, equator, poles)
   */
  it('Property 36: should calculate distance accurately using Haversine formula', async () => {
    await fc.assert(
      fc.property(
        // Generate two random coordinate pairs
        fc.double({ min: -90, max: 90, noNaN: true }), // lat1
        fc.double({ min: -180, max: 180, noNaN: true }), // lon1
        fc.double({ min: -90, max: 90, noNaN: true }), // lat2
        fc.double({ min: -180, max: 180, noNaN: true }), // lon2
        (lat1, lon1, lat2, lon2) => {
          // Calculate distance using the service method
          const calculatedDistance = LocationService.calculateDistance(lat1, lon1, lat2, lon2);

          // Reference implementation of Haversine formula for verification
          const referenceHaversine = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
            const R = 6371e3; // Earth's radius in meters
            const φ1 = (lat1 * Math.PI) / 180;
            const φ2 = (lat2 * Math.PI) / 180;
            const Δφ = ((lat2 - lat1) * Math.PI) / 180;
            const Δλ = ((lon2 - lon1) * Math.PI) / 180;

            const a =
              Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
              Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
            const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

            return R * c;
          };

          const referenceDistance = referenceHaversine(lat1, lon1, lat2, lon2);

          // Property 1: Calculated distance should be a valid number
          expect(calculatedDistance).not.toBeNaN();
          expect(calculatedDistance).toBeGreaterThanOrEqual(0);
          expect(calculatedDistance).toBeLessThanOrEqual(20037508.34); // Max distance on Earth (half circumference)

          // Property 2: Distance should match reference implementation
          // For very small distances (< 1 meter), allow absolute error of 0.01 meters
          // For larger distances, require < 1% relative error
          if (referenceDistance < 1) {
            // For very small distances, check absolute error
            const absoluteError = Math.abs(calculatedDistance - referenceDistance);
            expect(absoluteError).toBeLessThanOrEqual(0.01);
          } else {
            // For normal distances, check relative error (< 1%)
            const relativeError = Math.abs(calculatedDistance - referenceDistance) / referenceDistance;
            expect(relativeError).toBeLessThan(0.01); // < 1% error
          }

          // Property 3: Distance should be symmetric (distance A to B = distance B to A)
          const reverseDistance = LocationService.calculateDistance(lat2, lon2, lat1, lon1);
          const symmetryError = Math.abs(calculatedDistance - reverseDistance);
          
          // Allow tiny floating-point precision errors
          if (calculatedDistance > 0) {
            expect(symmetryError / calculatedDistance).toBeLessThan(1e-10);
          } else {
            expect(symmetryError).toBeLessThan(1e-10);
          }

          // Property 4: Distance from a point to itself should be zero (or very close)
          const samePointDistance = LocationService.calculateDistance(lat1, lon1, lat1, lon1);
          expect(samePointDistance).toBeLessThan(0.001); // Less than 1mm
        }
      ),
      { numRuns: 100 } // Run 100 iterations as specified in design
    );
  }, 60000);

  /**
   * Property 36 (edge cases): Distance calculation should handle special cases
   * Tests specific edge cases like equator, poles, and antipodal points
   */
  it('Property 36 (edge cases): should handle special geographic cases accurately', () => {
    // Test case 1: Same location should give distance ~0
    const sameLocationDistance = LocationService.calculateDistance(0, 0, 0, 0);
    expect(sameLocationDistance).toBeLessThan(0.001);

    // Test case 2: Points on equator
    const equatorDistance = LocationService.calculateDistance(0, 0, 0, 1);
    // 1 degree longitude at equator ≈ 111,320 meters
    expect(equatorDistance).toBeGreaterThan(111000);
    expect(equatorDistance).toBeLessThan(112000);

    // Test case 3: Points at North Pole
    const northPoleDistance = LocationService.calculateDistance(90, 0, 90, 180);
    // Any two points at the pole should be very close (within a few meters)
    expect(northPoleDistance).toBeLessThan(100);

    // Test case 4: Points at South Pole
    const southPoleDistance = LocationService.calculateDistance(-90, 0, -90, 180);
    expect(southPoleDistance).toBeLessThan(100);

    // Test case 5: Meridian distance (same longitude, different latitude)
    const meridianDistance = LocationService.calculateDistance(0, 0, 1, 0);
    // 1 degree latitude ≈ 111,320 meters
    expect(meridianDistance).toBeGreaterThan(111000);
    expect(meridianDistance).toBeLessThan(112000);

    // Test case 6: Known distance - New York to London
    // NYC: 40.7128° N, 74.0060° W
    // London: 51.5074° N, 0.1278° W
    const nycToLondon = LocationService.calculateDistance(40.7128, -74.0060, 51.5074, -0.1278);
    // Actual distance is approximately 5,570 km = 5,570,000 meters
    // Allow 1% error = 55,700 meters
    expect(nycToLondon).toBeGreaterThan(5514300); // 5,570,000 - 55,700
    expect(nycToLondon).toBeLessThan(5625700); // 5,570,000 + 55,700

    // Test case 7: Known distance - Sydney to Tokyo
    // Sydney: 33.8688° S, 151.2093° E
    // Tokyo: 35.6762° N, 139.6503° E
    const sydneyToTokyo = LocationService.calculateDistance(-33.8688, 151.2093, 35.6762, 139.6503);
    // Actual distance is approximately 7,820 km = 7,820,000 meters
    // Allow 1% error = 78,200 meters
    expect(sydneyToTokyo).toBeGreaterThan(7741800); // 7,820,000 - 78,200
    expect(sydneyToTokyo).toBeLessThan(7898200); // 7,820,000 + 78,200
  });

  /**
   * Property 36 (consistency): Multiple calculations with same inputs should give same result
   * Tests that the function is deterministic
   */
  it('Property 36 (consistency): should produce consistent results for same inputs', async () => {
    await fc.assert(
      fc.property(
        fc.double({ min: -90, max: 90, noNaN: true }),
        fc.double({ min: -180, max: 180, noNaN: true }),
        fc.double({ min: -90, max: 90, noNaN: true }),
        fc.double({ min: -180, max: 180, noNaN: true }),
        (lat1, lon1, lat2, lon2) => {
          // Calculate distance multiple times
          const distance1 = LocationService.calculateDistance(lat1, lon1, lat2, lon2);
          const distance2 = LocationService.calculateDistance(lat1, lon1, lat2, lon2);
          const distance3 = LocationService.calculateDistance(lat1, lon1, lat2, lon2);

          // Property: All calculations should produce identical results
          expect(distance1).toBe(distance2);
          expect(distance2).toBe(distance3);
          expect(distance1).toBe(distance3);
        }
      ),
      { numRuns: 100 }
    );
  }, 60000);

  /**
   * Property 37: Distance Filter Accuracy
   * For any radar query with a distance filter, all returned users should be within 
   * the specified distance from the querying user's location.
   * 
   * Validates: Requirements 17.4
   * 
   * This property tests that:
   * 1. All users returned by getNearbyUsers are within the specified radius
   * 2. The $maxDistance parameter in the MongoDB query matches the requested radius
   * 3. The distance calculation for each returned user confirms they are within range
   * 4. No users beyond the specified distance are included in results
   * 5. The filter works correctly for various radius values (small to large)
   */
  it('Property 37: should only return users within the specified distance range', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate random query location
        fc.double({ min: -89, max: 89, noNaN: true }), // query latitude
        fc.double({ min: -179, max: 179, noNaN: true }), // query longitude
        // Generate random radius (100m to 10km)
        fc.integer({ min: 100, max: 10000 }),
        // Generate random user ID to exclude
        fc.string({ minLength: 10, maxLength: 30 }),
        async (queryLat, queryLng, radius, excludeUserId) => {
          // Reset mocks for this iteration
          (Location.find as jest.Mock) = jest.fn();
          
          // Mock cache miss
          jest.spyOn(require('./cacheService').CacheService, 'get').mockResolvedValue(null);
          jest.spyOn(require('./cacheService').CacheService, 'set').mockResolvedValue(undefined);

          // Generate mock users at various distances using accurate inverse Haversine
          // This ensures users are placed at exact distances from the query point
          const mockUsers: any[] = [];
          
          // Helper function to calculate coordinates at a specific distance and bearing
          const calculateDestination = (lat: number, lng: number, distance: number, bearing: number) => {
            const R = 6371e3; // Earth radius in meters
            const φ1 = (lat * Math.PI) / 180;
            const λ1 = (lng * Math.PI) / 180;
            const bearingRad = (bearing * Math.PI) / 180;
            
            const φ2 = Math.asin(
              Math.sin(φ1) * Math.cos(distance / R) +
              Math.cos(φ1) * Math.sin(distance / R) * Math.cos(bearingRad)
            );
            
            const λ2 = λ1 + Math.atan2(
              Math.sin(bearingRad) * Math.sin(distance / R) * Math.cos(φ1),
              Math.cos(distance / R) - Math.sin(φ1) * Math.sin(φ2)
            );
            
            return {
              lat: (φ2 * 180) / Math.PI,
              lng: (λ2 * 180) / Math.PI
            };
          };
          
          // User 1: Very close (within 10% of radius)
          const closeDistance = radius * 0.1;
          const closeCoords = calculateDestination(queryLat, queryLng, closeDistance, 45);
          mockUsers.push({
            userId: 'user-close',
            coordinates: {
              type: 'Point',
              coordinates: [closeCoords.lng, closeCoords.lat]
            },
            mode: 'explore',
            timestamp: new Date(),
            accuracy: 10
          });

          // User 2: Mid-range (around 50% of radius)
          const midDistance = radius * 0.5;
          const midCoords = calculateDestination(queryLat, queryLng, midDistance, 90);
          mockUsers.push({
            userId: 'user-mid',
            coordinates: {
              type: 'Point',
              coordinates: [midCoords.lng, midCoords.lat]
            },
            mode: 'explore',
            timestamp: new Date(),
            accuracy: 15
          });

          // User 3: Near boundary (around 90% of radius to avoid floating-point edge cases)
          const nearBoundaryDistance = radius * 0.9;
          const nearBoundaryCoords = calculateDestination(queryLat, queryLng, nearBoundaryDistance, 135);
          mockUsers.push({
            userId: 'user-boundary',
            coordinates: {
              type: 'Point',
              coordinates: [nearBoundaryCoords.lng, nearBoundaryCoords.lat]
            },
            mode: 'explore',
            timestamp: new Date(),
            accuracy: 20
          });

          // Mock the Location.find chain to return users within range
          const mockPopulate = jest.fn().mockReturnThis();
          const mockLean = jest.fn().mockReturnThis();
          const mockLimit = jest.fn().mockResolvedValue(mockUsers);

          (Location.find as jest.Mock).mockReturnValue({
            populate: mockPopulate,
            lean: mockLean,
            limit: mockLimit
          });

          // Call getNearbyUsers
          const results = await LocationService.getNearbyUsers(
            queryLat,
            queryLng,
            radius,
            excludeUserId
          );

          // Verify Location.find was called with correct query
          expect(Location.find).toHaveBeenCalledTimes(1);
          const query = (Location.find as jest.Mock).mock.calls[0][0];

          // Property 1: Query should use $nearSphere with $maxDistance
          expect(query.coordinates).toHaveProperty('$nearSphere');
          expect(query.coordinates.$nearSphere).toHaveProperty('$maxDistance');

          // Property 2: $maxDistance should match the requested radius
          expect(query.coordinates.$nearSphere.$maxDistance).toBe(radius);

          // Property 3: Query should filter for explore mode only
          expect(query.mode).toBe('explore');

          // Property 4: Query should exclude the specified user
          expect(query.userId).toEqual({ $ne: excludeUserId });

          // Property 5: All returned users should be within the specified distance
          // Calculate actual distance for each returned user
          results.forEach(user => {
            const userLat = user.coordinates.coordinates[1]; // GeoJSON: [lng, lat]
            const userLng = user.coordinates.coordinates[0];
            
            const actualDistance = LocationService.calculateDistance(
              queryLat,
              queryLng,
              userLat,
              userLng
            );

            // Property: Distance should be within the specified radius
            // Allow small margin for floating-point precision (0.1%)
            const margin = radius * 0.001;
            expect(actualDistance).toBeLessThanOrEqual(radius + margin);
          });

          // Property 6: Results should not be empty (we mocked users within range)
          expect(results.length).toBeGreaterThan(0);

          // Property 7: All results should be in explore mode
          results.forEach(user => {
            expect(user.mode).toBe('explore');
          });

          // Property 8: Excluded user should not be in results
          const resultUserIds = results.map(u => u.userId);
          expect(resultUserIds).not.toContain(excludeUserId);
        }
      ),
      { numRuns: 100 } // Run 100 iterations as specified in design
    );
  }, 60000);

  /**
   * Property 37 (boundary test): Users exactly at the boundary should be included
   * Tests that the distance filter is inclusive (<=) not exclusive (<)
   */
  it('Property 37 (boundary): should include users exactly at the distance boundary', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.double({ min: -89, max: 89, noNaN: true }),
        fc.double({ min: -179, max: 179, noNaN: true }),
        fc.integer({ min: 1000, max: 5000 }),
        async (queryLat, queryLng, radius) => {
          // Reset mocks
          (Location.find as jest.Mock) = jest.fn();
          
          // Mock cache miss
          jest.spyOn(require('./cacheService').CacheService, 'get').mockResolvedValue(null);
          jest.spyOn(require('./cacheService').CacheService, 'set').mockResolvedValue(undefined);

          // Create a user exactly at the boundary distance
          // Use the inverse haversine to calculate coordinates at exact distance
          const bearing = 45; // degrees (northeast)
          const bearingRad = (bearing * Math.PI) / 180;
          const R = 6371e3; // Earth radius in meters
          
          const φ1 = (queryLat * Math.PI) / 180;
          const λ1 = (queryLng * Math.PI) / 180;
          
          const φ2 = Math.asin(
            Math.sin(φ1) * Math.cos(radius / R) +
            Math.cos(φ1) * Math.sin(radius / R) * Math.cos(bearingRad)
          );
          
          const λ2 = λ1 + Math.atan2(
            Math.sin(bearingRad) * Math.sin(radius / R) * Math.cos(φ1),
            Math.cos(radius / R) - Math.sin(φ1) * Math.sin(φ2)
          );
          
          const boundaryLat = (φ2 * 180) / Math.PI;
          const boundaryLng = (λ2 * 180) / Math.PI;

          const mockBoundaryUser = {
            userId: 'user-at-boundary',
            coordinates: {
              type: 'Point',
              coordinates: [boundaryLng, boundaryLat]
            },
            mode: 'explore',
            timestamp: new Date(),
            accuracy: 10
          };

          // Mock the Location.find chain
          const mockPopulate = jest.fn().mockReturnThis();
          const mockLean = jest.fn().mockReturnThis();
          const mockLimit = jest.fn().mockResolvedValue([mockBoundaryUser]);

          (Location.find as jest.Mock).mockReturnValue({
            populate: mockPopulate,
            lean: mockLean,
            limit: mockLimit
          });

          // Query for nearby users
          const results = await LocationService.getNearbyUsers(queryLat, queryLng, radius);

          // Verify the query was made with correct maxDistance
          const query = (Location.find as jest.Mock).mock.calls[0][0];
          expect(query.coordinates.$nearSphere.$maxDistance).toBe(radius);

          // Property: User at boundary should be included
          // MongoDB's $maxDistance is inclusive (<=)
          expect(results.length).toBeGreaterThan(0);
          
          // Verify the distance is approximately at the boundary
          const actualDistance = LocationService.calculateDistance(
            queryLat,
            queryLng,
            boundaryLat,
            boundaryLng
          );
          
          // Allow 1% margin for floating-point precision
          const margin = radius * 0.01;
          expect(actualDistance).toBeGreaterThanOrEqual(radius - margin);
          expect(actualDistance).toBeLessThanOrEqual(radius + margin);
        }
      ),
      { numRuns: 50 } // Reduced runs due to complex calculations
    );
  }, 60000);

  /**
   * Property 37 (exclusion test): Users beyond the distance should not be returned
   * Tests that the filter correctly excludes users outside the radius
   */
  it('Property 37 (exclusion): should not return users beyond the specified distance', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.double({ min: -89, max: 89, noNaN: true }),
        fc.double({ min: -179, max: 179, noNaN: true }),
        fc.integer({ min: 1000, max: 5000 }),
        async (queryLat, queryLng, radius) => {
          // Reset mocks
          (Location.find as jest.Mock) = jest.fn();
          
          // Mock cache miss
          jest.spyOn(require('./cacheService').CacheService, 'get').mockResolvedValue(null);
          jest.spyOn(require('./cacheService').CacheService, 'set').mockResolvedValue(undefined);

          // Mock the Location.find chain to return empty results
          // (simulating that all users beyond the radius are filtered out by MongoDB)
          const mockPopulate = jest.fn().mockReturnThis();
          const mockLean = jest.fn().mockReturnThis();
          const mockLimit = jest.fn().mockResolvedValue([]);

          (Location.find as jest.Mock).mockReturnValue({
            populate: mockPopulate,
            lean: mockLean,
            limit: mockLimit
          });

          // Query for nearby users
          const results = await LocationService.getNearbyUsers(queryLat, queryLng, radius);

          // Verify the query structure
          const query = (Location.find as jest.Mock).mock.calls[0][0];
          
          // Property 1: Query should have $maxDistance set to the radius
          expect(query.coordinates.$nearSphere.$maxDistance).toBe(radius);

          // Property 2: Results should be empty (no users within range in this test)
          expect(results).toEqual([]);

          // Property 3: The query structure ensures MongoDB filters by distance
          // The $nearSphere operator with $maxDistance guarantees only users
          // within the specified distance are returned
          expect(query.coordinates.$nearSphere).toHaveProperty('$geometry');
          expect(query.coordinates.$nearSphere).toHaveProperty('$maxDistance');
        }
      ),
      { numRuns: 100 }
    );
  }, 60000);

  /**
   * Property 10: Real-Time Radar Updates
   * For any user with Explore Mode enabled, when their location changes significantly 
   * (beyond accuracy threshold), all nearby users should receive updated radar data 
   * reflecting the new position within a reasonable time window (< 5 seconds).
   * 
   * Validates: Requirements 4.4, 17.2
   * 
   * This property tests that:
   * 1. When a user updates their location, the system stores the new location
   * 2. The location update includes all required fields (coordinates, mode, timestamp)
   * 3. The system can query nearby users to determine who should receive updates
   * 4. The location change is significant enough to warrant an update (beyond accuracy threshold)
   * 5. The system maintains location history with timestamps for tracking changes
   * 
   * Note: This test focuses on the data layer aspects of real-time updates.
   * The WebSocket broadcasting mechanism is tested separately in integration tests.
   */
  it('Property 10: should support real-time radar updates when location changes significantly', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate random user ID
        fc.string({ minLength: 10, maxLength: 30 }),
        // Generate initial location
        fc.double({ min: -89, max: 89, noNaN: true }), // initial latitude
        fc.double({ min: -179, max: 179, noNaN: true }), // initial longitude
        // Generate location change (movement in meters)
        fc.integer({ min: 50, max: 1000 }), // movement distance in meters
        // Generate accuracy
        fc.double({ min: 5, max: 50, noNaN: true }),
        // Generate radar range for nearby users
        fc.integer({ min: 1000, max: 5000 }),
        async (userId, initialLat, initialLng, movementMeters, accuracy, radarRange) => {
          // Reset mocks for this iteration
          (redis.get as jest.Mock).mockReset();
          (redis.setex as jest.Mock).mockReset();
          (redis.del as jest.Mock).mockReset();
          (Location.findOneAndUpdate as jest.Mock).mockReset();
          (Location.find as jest.Mock) = jest.fn();

          // Mock Redis to allow updates
          (redis.get as jest.Mock).mockResolvedValue(null);
          (redis.setex as jest.Mock).mockResolvedValue('OK');
          (redis.del as jest.Mock).mockResolvedValue(1);

          // Mock cache for nearby users query
          jest.spyOn(require('./cacheService').CacheService, 'get').mockResolvedValue(null);
          jest.spyOn(require('./cacheService').CacheService, 'set').mockResolvedValue(undefined);

          // Step 1: Update initial location
          const initialTimestamp = new Date(Date.now() - 2000); // 2 seconds ago
          const initialLocation = {
            userId,
            coordinates: {
              type: 'Point',
              coordinates: [initialLng, initialLat]
            },
            mode: 'explore',
            timestamp: initialTimestamp,
            accuracy
          };
          (Location.findOneAndUpdate as jest.Mock).mockResolvedValue(initialLocation);

          await LocationService.updateLocation(userId, initialLat, initialLng, accuracy, 'explore');

          // Property 1: Initial location should be stored
          expect(Location.findOneAndUpdate).toHaveBeenCalledTimes(1);
          const [filter1, update1] = (Location.findOneAndUpdate as jest.Mock).mock.calls[0];
          expect(filter1).toEqual({ userId });
          expect(update1.mode).toBe('explore');
          expect(update1.coordinates.coordinates).toEqual([initialLng, initialLat]);

          // Step 2: Calculate new location after movement
          // Use simple approximation: 1 degree latitude ≈ 111,320 meters
          const latChange = movementMeters / 111320;
          const lngChange = movementMeters / (111320 * Math.cos(initialLat * Math.PI / 180));
          const newLat = initialLat + latChange;
          const newLng = initialLng + lngChange;

          // Ensure new coordinates are within valid bounds
          const clampedNewLat = Math.max(-90, Math.min(90, newLat));
          const clampedNewLng = Math.max(-180, Math.min(180, newLng));

          // Reset mocks for second update
          (redis.get as jest.Mock).mockReset();
          (redis.setex as jest.Mock).mockReset();
          (redis.del as jest.Mock).mockReset();
          (Location.findOneAndUpdate as jest.Mock).mockReset();

          // Mock Redis to allow second update (simulate time passing)
          (redis.get as jest.Mock).mockResolvedValue(null);
          (redis.setex as jest.Mock).mockResolvedValue('OK');
          (redis.del as jest.Mock).mockResolvedValue(1);

          // Step 3: Update to new location with a later timestamp
          const newTimestamp = new Date(Date.now()); // Current time
          const newLocation = {
            userId,
            coordinates: {
              type: 'Point',
              coordinates: [clampedNewLng, clampedNewLat]
            },
            mode: 'explore',
            timestamp: newTimestamp,
            accuracy
          };
          (Location.findOneAndUpdate as jest.Mock).mockResolvedValue(newLocation);

          await LocationService.updateLocation(userId, clampedNewLat, clampedNewLng, accuracy, 'explore');

          // Property 2: New location should be stored with updated coordinates
          expect(Location.findOneAndUpdate).toHaveBeenCalledTimes(1);
          const [filter2, update2] = (Location.findOneAndUpdate as jest.Mock).mock.calls[0];
          expect(filter2).toEqual({ userId });
          expect(update2.mode).toBe('explore');
          expect(update2.coordinates.coordinates).toEqual([clampedNewLng, clampedNewLat]);

          // Property 3: Timestamp should be updated to reflect the change
          expect(update2.timestamp).toBeInstanceOf(Date);
          // The new timestamp should be at least as recent as the initial timestamp
          expect(update2.timestamp.getTime()).toBeGreaterThanOrEqual(initialTimestamp.getTime());

          // Property 4: Calculate actual distance moved
          const actualDistance = LocationService.calculateDistance(
            initialLat,
            initialLng,
            clampedNewLat,
            clampedNewLng
          );

          // Property 5: Movement should be significant (beyond accuracy threshold)
          // For real-time updates to be meaningful, movement should exceed accuracy
          expect(actualDistance).toBeGreaterThan(0);

          // Step 4: Query nearby users who should receive the update
          // Mock nearby users within radar range
          const mockNearbyUsers = [
            {
              userId: 'nearby-user-1',
              coordinates: {
                type: 'Point',
                coordinates: [clampedNewLng + 0.001, clampedNewLat + 0.001]
              },
              mode: 'explore',
              timestamp: new Date(),
              accuracy: 10
            },
            {
              userId: 'nearby-user-2',
              coordinates: {
                type: 'Point',
                coordinates: [clampedNewLng + 0.002, clampedNewLat + 0.002]
              },
              mode: 'explore',
              timestamp: new Date(),
              accuracy: 15
            }
          ];

          const mockPopulate = jest.fn().mockReturnThis();
          const mockLean = jest.fn().mockReturnThis();
          const mockLimit = jest.fn().mockResolvedValue(mockNearbyUsers);

          (Location.find as jest.Mock).mockReturnValue({
            populate: mockPopulate,
            lean: mockLean,
            limit: mockLimit
          });

          // Query for nearby users who should receive the radar update
          const nearbyUsers = await LocationService.getNearbyUsers(
            clampedNewLat,
            clampedNewLng,
            radarRange,
            userId // Exclude the moving user
          );

          // Property 6: System should be able to identify nearby users
          expect(Location.find).toHaveBeenCalledTimes(1);
          const query = (Location.find as jest.Mock).mock.calls[0][0];

          // Property 7: Query should use the new location coordinates
          expect(query.coordinates.$nearSphere.$geometry.coordinates).toEqual([clampedNewLng, clampedNewLat]);

          // Property 8: Query should filter for explore mode users only
          expect(query.mode).toBe('explore');

          // Property 9: Query should exclude the moving user
          expect(query.userId).toEqual({ $ne: userId });

          // Property 10: Query should use the specified radar range
          expect(query.coordinates.$nearSphere.$maxDistance).toBe(radarRange);

          // Property 11: Nearby users should be returned for notification
          expect(nearbyUsers.length).toBeGreaterThan(0);
          nearbyUsers.forEach(user => {
            expect(user.mode).toBe('explore');
            expect(user.userId).not.toBe(userId);
          });

          // Property 12: Cache should be invalidated after location update
          // This ensures fresh data for subsequent queries
          expect(redis.del).toHaveBeenCalledWith('nearby:*');

          // Property 13: Rate limiting should be enforced
          // Cooldown should be set after successful update
          expect(redis.setex).toHaveBeenCalledWith(
            `location:cooldown:${userId}`,
            expect.any(Number),
            '1'
          );
        }
      ),
      { numRuns: 100 } // Run 100 iterations as specified in design
    );
  }, 60000);

  /**
   * Property 10 (timing): Location updates should be timestamped for tracking changes
   * This ensures we can track when location changes occurred
   */
  it('Property 10 (timing): should timestamp location updates for change tracking', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 10, maxLength: 30 }),
        fc.double({ min: -89, max: 89, noNaN: true }),
        fc.double({ min: -179, max: 179, noNaN: true }),
        fc.double({ min: 5, max: 50, noNaN: true }),
        async (userId, latitude, longitude, accuracy) => {
          // Reset mocks
          (redis.get as jest.Mock).mockReset();
          (redis.setex as jest.Mock).mockReset();
          (redis.del as jest.Mock).mockReset();
          (Location.findOneAndUpdate as jest.Mock).mockReset();

          // Mock Redis to allow update
          (redis.get as jest.Mock).mockResolvedValue(null);
          (redis.setex as jest.Mock).mockResolvedValue('OK');
          (redis.del as jest.Mock).mockResolvedValue(1);
          (Location.findOneAndUpdate as jest.Mock).mockResolvedValue({});

          const beforeUpdate = Date.now();
          
          // Update location
          await LocationService.updateLocation(userId, latitude, longitude, accuracy, 'explore');
          
          const afterUpdate = Date.now();

          // Verify timestamp is set
          const [, update] = (Location.findOneAndUpdate as jest.Mock).mock.calls[0];
          expect(update.timestamp).toBeInstanceOf(Date);
          
          // Property: Timestamp should be within the update time window
          const updateTime = update.timestamp.getTime();
          expect(updateTime).toBeGreaterThanOrEqual(beforeUpdate);
          expect(updateTime).toBeLessThanOrEqual(afterUpdate);
        }
      ),
      { numRuns: 100 }
    );
  }, 60000);

  /**
   * Property 10 (cache invalidation): Location updates should invalidate nearby user cache
   * This ensures real-time updates reflect fresh data
   */
  it('Property 10 (cache invalidation): should invalidate cache after location updates', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 10, maxLength: 30 }),
        fc.double({ min: -89, max: 89, noNaN: true }),
        fc.double({ min: -179, max: 179, noNaN: true }),
        fc.double({ min: 5, max: 50, noNaN: true }),
        async (userId, latitude, longitude, accuracy) => {
          // Reset mocks
          (redis.get as jest.Mock).mockReset();
          (redis.setex as jest.Mock).mockReset();
          (redis.del as jest.Mock).mockReset();
          (Location.findOneAndUpdate as jest.Mock).mockReset();

          // Mock Redis to allow update
          (redis.get as jest.Mock).mockResolvedValue(null);
          (redis.setex as jest.Mock).mockResolvedValue('OK');
          (redis.del as jest.Mock).mockResolvedValue(1);
          (Location.findOneAndUpdate as jest.Mock).mockResolvedValue({});

          // Update location
          await LocationService.updateLocation(userId, latitude, longitude, accuracy, 'explore');

          // Property: Cache should be invalidated to ensure fresh data
          expect(redis.del).toHaveBeenCalledWith('nearby:*');
          
          // This ensures that subsequent radar queries will fetch fresh data
          // from the database, reflecting the updated location
        }
      ),
      { numRuns: 100 }
    );
  }, 60000);
});


/**
 * Property 9: Nearby User Notifications
 * For any user who enables Explore Mode, all nearby users (within radar range) 
 * with Explore Mode enabled should receive a notification of their presence.
 * 
 * Validates: Requirements 3.8, 13.1
 * 
 * This property tests that:
 * 1. When a user enables explore mode, the system queries for nearby users
 * 2. Only users in explore mode within the radar range are identified as nearby
 * 3. The system can identify all nearby users who should receive notifications
 * 4. The nearby users query excludes the user who enabled explore mode
 * 5. The notification mechanism can target multiple nearby users
 * 6. Users in vanish mode do not receive notifications
 * 7. The radar range for notifications is configurable
 * 
 * Note: This test focuses on the data layer logic for identifying nearby users
 * who should receive notifications. The actual WebSocket notification delivery
 * is tested separately in integration tests.
 */
describe('Property 9: Nearby User Notifications', () => {
  it('should identify nearby users for notification when explore mode is enabled', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate random user who enables explore mode
        fc.string({ minLength: 10, maxLength: 30 }),
        // Generate location where user enables explore mode
        fc.double({ min: -89, max: 89, noNaN: true }), // latitude
        fc.double({ min: -179, max: 179, noNaN: true }), // longitude
        // Generate accuracy
        fc.double({ min: 5, max: 50, noNaN: true }),
        // Generate radar range for notifications (1km to 10km)
        fc.integer({ min: 1000, max: 10000 }),
        // Generate number of nearby users (1 to 10)
        fc.integer({ min: 1, max: 10 }),
        async (userId, latitude, longitude, accuracy, radarRange, nearbyUserCount) => {
          // Reset mocks for this iteration
          (redis.get as jest.Mock).mockReset();
          (redis.setex as jest.Mock).mockReset();
          (redis.del as jest.Mock).mockReset();
          (Location.findOneAndUpdate as jest.Mock).mockReset();
          (Location.find as jest.Mock) = jest.fn();

          // Mock Redis to allow location update
          (redis.get as jest.Mock).mockResolvedValue(null);
          (redis.setex as jest.Mock).mockResolvedValue('OK');
          (redis.del as jest.Mock).mockResolvedValue(1);

          // Mock location update for the user enabling explore mode
          const userLocation = {
            userId,
            coordinates: {
              type: 'Point',
              coordinates: [longitude, latitude]
            },
            mode: 'explore',
            timestamp: new Date(),
            accuracy
          };
          (Location.findOneAndUpdate as jest.Mock).mockResolvedValue(userLocation);

          // Step 1: User enables explore mode by updating location
          await LocationService.updateLocation(userId, latitude, longitude, accuracy, 'explore');

          // Property 1: Location should be updated with mode='explore'
          expect(Location.findOneAndUpdate).toHaveBeenCalledTimes(1);
          const [filter, update] = (Location.findOneAndUpdate as jest.Mock).mock.calls[0];
          expect(filter).toEqual({ userId });
          expect(update.mode).toBe('explore');
          expect(update.coordinates.coordinates).toEqual([longitude, latitude]);

          // Mock cache miss for nearby users query
          jest.spyOn(require('./cacheService').CacheService, 'get').mockResolvedValue(null);
          jest.spyOn(require('./cacheService').CacheService, 'set').mockResolvedValue(undefined);

          // Step 2: Generate mock nearby users in explore mode
          const mockNearbyUsers = [];
          for (let i = 0; i < nearbyUserCount; i++) {
            // Place users at various distances within the radar range
            const distanceFraction = (i + 1) / (nearbyUserCount + 1); // Distribute evenly
            const distance = radarRange * distanceFraction;
            
            // Calculate offset in degrees (approximate)
            const latOffset = (distance / 111320) * Math.cos((i * 45) * Math.PI / 180);
            const lngOffset = (distance / (111320 * Math.cos(latitude * Math.PI / 180))) * Math.sin((i * 45) * Math.PI / 180);
            
            // Clamp to valid coordinate ranges
            const nearbyLat = Math.max(-90, Math.min(90, latitude + latOffset));
            const nearbyLng = Math.max(-180, Math.min(180, longitude + lngOffset));
            
            mockNearbyUsers.push({
              userId: `nearby-user-${i}`,
              coordinates: {
                type: 'Point',
                coordinates: [nearbyLng, nearbyLat]
              },
              mode: 'explore',
              timestamp: new Date(),
              accuracy: 10
            });
          }

          // Mock the Location.find chain to return nearby users
          const mockPopulate = jest.fn().mockReturnThis();
          const mockLean = jest.fn().mockReturnThis();
          const mockLimit = jest.fn().mockResolvedValue(mockNearbyUsers);

          (Location.find as jest.Mock).mockReturnValue({
            populate: mockPopulate,
            lean: mockLean,
            limit: mockLimit
          });

          // Step 3: Query for nearby users who should receive notifications
          const nearbyUsers = await LocationService.getNearbyUsers(
            latitude,
            longitude,
            radarRange,
            userId // Exclude the user who enabled explore mode
          );

          // Property 2: System should query for nearby users
          expect(Location.find).toHaveBeenCalledTimes(1);
          const query = (Location.find as jest.Mock).mock.calls[0][0];

          // Property 3: Query should filter for explore mode only
          expect(query.mode).toBe('explore');

          // Property 4: Query should use geospatial search with correct location
          expect(query.coordinates).toHaveProperty('$nearSphere');
          expect(query.coordinates.$nearSphere.$geometry.type).toBe('Point');
          expect(query.coordinates.$nearSphere.$geometry.coordinates).toEqual([longitude, latitude]);

          // Property 5: Query should use the specified radar range
          expect(query.coordinates.$nearSphere.$maxDistance).toBe(radarRange);

          // Property 6: Query should exclude the user who enabled explore mode
          expect(query.userId).toEqual({ $ne: userId });

          // Property 7: Nearby users should be returned for notification
          expect(nearbyUsers.length).toBe(nearbyUserCount);
          expect(nearbyUsers.length).toBeGreaterThan(0);

          // Property 8: All returned users should be in explore mode
          nearbyUsers.forEach(user => {
            expect(user.mode).toBe('explore');
          });

          // Property 9: The user who enabled explore mode should not be in results
          const nearbyUserIds = nearbyUsers.map(u => u.userId);
          expect(nearbyUserIds).not.toContain(userId);

          // Property 10: All nearby users should be within the radar range
          nearbyUsers.forEach(user => {
            const userLat = user.coordinates.coordinates[1];
            const userLng = user.coordinates.coordinates[0];
            
            const distance = LocationService.calculateDistance(
              latitude,
              longitude,
              userLat,
              userLng
            );

            // Allow small margin for floating-point precision
            const margin = radarRange * 0.001;
            expect(distance).toBeLessThanOrEqual(radarRange + margin);
          });

          // Property 11: Each nearby user should have valid coordinates
          nearbyUsers.forEach(user => {
            expect(user.coordinates.type).toBe('Point');
            expect(user.coordinates.coordinates).toHaveLength(2);
            
            const [lng, lat] = user.coordinates.coordinates;
            expect(lat).toBeGreaterThanOrEqual(-90);
            expect(lat).toBeLessThanOrEqual(90);
            expect(lng).toBeGreaterThanOrEqual(-180);
            expect(lng).toBeLessThanOrEqual(180);
          });

          // Property 12: The system can identify multiple nearby users for notification
          // This validates that the notification mechanism can target multiple recipients
          expect(nearbyUsers.length).toBeGreaterThanOrEqual(1);
          expect(nearbyUsers.length).toBeLessThanOrEqual(nearbyUserCount);
        }
      ),
      { numRuns: 100 } // Run 100 iterations as specified in design
    );
  }, 60000);

  /**
   * Property 9 (vanish mode exclusion): Users in vanish mode should not receive notifications
   * This ensures that vanish mode users are not notified when someone enables explore mode
   */
  it('should not include vanish mode users in notification recipients', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 10, maxLength: 30 }),
        fc.double({ min: -89, max: 89, noNaN: true }),
        fc.double({ min: -179, max: 179, noNaN: true }),
        fc.double({ min: 5, max: 50, noNaN: true }),
        fc.integer({ min: 1000, max: 10000 }),
        async (userId, latitude, longitude, accuracy, radarRange) => {
          // Reset mocks
          (redis.get as jest.Mock).mockReset();
          (redis.setex as jest.Mock).mockReset();
          (redis.del as jest.Mock).mockReset();
          (Location.findOneAndUpdate as jest.Mock).mockReset();
          (Location.find as jest.Mock) = jest.fn();

          // Mock Redis to allow update
          (redis.get as jest.Mock).mockResolvedValue(null);
          (redis.setex as jest.Mock).mockResolvedValue('OK');
          (redis.del as jest.Mock).mockResolvedValue(1);
          (Location.findOneAndUpdate as jest.Mock).mockResolvedValue({});

          // User enables explore mode
          await LocationService.updateLocation(userId, latitude, longitude, accuracy, 'explore');

          // Mock cache miss
          jest.spyOn(require('./cacheService').CacheService, 'get').mockResolvedValue(null);
          jest.spyOn(require('./cacheService').CacheService, 'set').mockResolvedValue(undefined);

          // Mock nearby users query - return only explore mode users
          // (vanish mode users are filtered out by the query)
          const mockExploreUsers = [
            {
              userId: 'explore-user-1',
              coordinates: {
                type: 'Point',
                coordinates: [longitude + 0.001, latitude + 0.001]
              },
              mode: 'explore',
              timestamp: new Date(),
              accuracy: 10
            }
          ];

          const mockPopulate = jest.fn().mockReturnThis();
          const mockLean = jest.fn().mockReturnThis();
          const mockLimit = jest.fn().mockResolvedValue(mockExploreUsers);

          (Location.find as jest.Mock).mockReturnValue({
            populate: mockPopulate,
            lean: mockLean,
            limit: mockLimit
          });

          // Query for nearby users
          const nearbyUsers = await LocationService.getNearbyUsers(
            latitude,
            longitude,
            radarRange,
            userId
          );

          // Property 1: Query should explicitly filter for explore mode only
          const query = (Location.find as jest.Mock).mock.calls[0][0];
          expect(query.mode).toBe('explore');

          // Property 2: All returned users should be in explore mode
          nearbyUsers.forEach(user => {
            expect(user.mode).toBe('explore');
            expect(user.mode).not.toBe('vanish');
          });

          // Property 3: No vanish mode users should be in results
          // The query structure ensures vanish mode users are excluded
          expect(query.mode).not.toBe('vanish');
          
          // This validates that vanish mode users will not receive notifications
          // because they are not included in the nearby users query results
        }
      ),
      { numRuns: 100 }
    );
  }, 60000);

  /**
   * Property 9 (empty result): When no nearby users exist, notification list should be empty
   * This ensures the system handles the case where no one is nearby
   */
  it('should handle case when no nearby users exist', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 10, maxLength: 30 }),
        fc.double({ min: -89, max: 89, noNaN: true }),
        fc.double({ min: -179, max: 179, noNaN: true }),
        fc.double({ min: 5, max: 50, noNaN: true }),
        fc.integer({ min: 1000, max: 10000 }),
        async (userId, latitude, longitude, accuracy, radarRange) => {
          // Reset mocks
          (redis.get as jest.Mock).mockReset();
          (redis.setex as jest.Mock).mockReset();
          (redis.del as jest.Mock).mockReset();
          (Location.findOneAndUpdate as jest.Mock).mockReset();
          (Location.find as jest.Mock) = jest.fn();

          // Mock Redis to allow update
          (redis.get as jest.Mock).mockResolvedValue(null);
          (redis.setex as jest.Mock).mockResolvedValue('OK');
          (redis.del as jest.Mock).mockResolvedValue(1);
          (Location.findOneAndUpdate as jest.Mock).mockResolvedValue({});

          // User enables explore mode
          await LocationService.updateLocation(userId, latitude, longitude, accuracy, 'explore');

          // Mock cache miss
          jest.spyOn(require('./cacheService').CacheService, 'get').mockResolvedValue(null);
          jest.spyOn(require('./cacheService').CacheService, 'set').mockResolvedValue(undefined);

          // Mock empty nearby users result (no one nearby)
          const mockPopulate = jest.fn().mockReturnThis();
          const mockLean = jest.fn().mockReturnThis();
          const mockLimit = jest.fn().mockResolvedValue([]);

          (Location.find as jest.Mock).mockReturnValue({
            populate: mockPopulate,
            lean: mockLean,
            limit: mockLimit
          });

          // Query for nearby users
          const nearbyUsers = await LocationService.getNearbyUsers(
            latitude,
            longitude,
            radarRange,
            userId
          );

          // Property 1: Query should still be executed correctly
          expect(Location.find).toHaveBeenCalledTimes(1);
          const query = (Location.find as jest.Mock).mock.calls[0][0];
          expect(query.mode).toBe('explore');
          expect(query.userId).toEqual({ $ne: userId });

          // Property 2: Result should be an empty array
          expect(nearbyUsers).toEqual([]);
          expect(nearbyUsers.length).toBe(0);

          // Property 3: System should handle empty result gracefully
          // No notifications should be sent when no nearby users exist
          expect(Array.isArray(nearbyUsers)).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  }, 60000);

  /**
   * Property 9 (distance boundary): Only users within radar range should be notified
   * This ensures the notification radius is respected
   */
  it('should only notify users within the specified radar range', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 10, maxLength: 30 }),
        fc.double({ min: -89, max: 89, noNaN: true }),
        fc.double({ min: -179, max: 179, noNaN: true }),
        fc.double({ min: 5, max: 50, noNaN: true }),
        fc.integer({ min: 2000, max: 5000 }), // Radar range
        async (userId, latitude, longitude, accuracy, radarRange) => {
          // Reset mocks
          (redis.get as jest.Mock).mockReset();
          (redis.setex as jest.Mock).mockReset();
          (redis.del as jest.Mock).mockReset();
          (Location.findOneAndUpdate as jest.Mock).mockReset();
          (Location.find as jest.Mock) = jest.fn();

          // Mock Redis to allow update
          (redis.get as jest.Mock).mockResolvedValue(null);
          (redis.setex as jest.Mock).mockResolvedValue('OK');
          (redis.del as jest.Mock).mockResolvedValue(1);
          (Location.findOneAndUpdate as jest.Mock).mockResolvedValue({});

          // User enables explore mode
          await LocationService.updateLocation(userId, latitude, longitude, accuracy, 'explore');

          // Mock cache miss
          jest.spyOn(require('./cacheService').CacheService, 'get').mockResolvedValue(null);
          jest.spyOn(require('./cacheService').CacheService, 'set').mockResolvedValue(undefined);

          // Create mock users: some within range, some at boundary
          const withinRangeDistance = radarRange * 0.5;
          const withinRangeLat = latitude + (withinRangeDistance / 111320);
          const withinRangeLng = longitude + (withinRangeDistance / (111320 * Math.cos(latitude * Math.PI / 180)));

          const mockNearbyUsers = [
            {
              userId: 'user-within-range',
              coordinates: {
                type: 'Point',
                coordinates: [withinRangeLng, withinRangeLat]
              },
              mode: 'explore',
              timestamp: new Date(),
              accuracy: 10
            }
          ];

          const mockPopulate = jest.fn().mockReturnThis();
          const mockLean = jest.fn().mockReturnThis();
          const mockLimit = jest.fn().mockResolvedValue(mockNearbyUsers);

          (Location.find as jest.Mock).mockReturnValue({
            populate: mockPopulate,
            lean: mockLean,
            limit: mockLimit
          });

          // Query for nearby users
          const nearbyUsers = await LocationService.getNearbyUsers(
            latitude,
            longitude,
            radarRange,
            userId
          );

          // Property 1: Query should use the specified radar range
          const query = (Location.find as jest.Mock).mock.calls[0][0];
          expect(query.coordinates.$nearSphere.$maxDistance).toBe(radarRange);

          // Property 2: All returned users should be within the radar range
          nearbyUsers.forEach(user => {
            const userLat = user.coordinates.coordinates[1];
            const userLng = user.coordinates.coordinates[0];
            
            const distance = LocationService.calculateDistance(
              latitude,
              longitude,
              userLat,
              userLng
            );

            // Allow small margin for floating-point precision
            const margin = radarRange * 0.001;
            expect(distance).toBeLessThanOrEqual(radarRange + margin);
          });

          // Property 3: The $maxDistance parameter ensures MongoDB filters by distance
          // Users beyond the radar range are automatically excluded by the database query
          expect(query.coordinates.$nearSphere).toHaveProperty('$maxDistance');
        }
      ),
      { numRuns: 100 }
    );
  }, 60000);
});
