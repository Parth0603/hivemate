import redis from '../config/redis';

/**
 * Cache Service for optimizing database queries
 * Implements caching strategies for frequently accessed data
 */
export class CacheService {
  // Cache TTL values (in seconds)
  private static readonly PROFILE_TTL = 300; // 5 minutes
  private static readonly NEARBY_USERS_TTL = 30; // 30 seconds
  private static readonly SEARCH_RESULTS_TTL = 60; // 1 minute
  private static readonly FRIENDSHIP_TTL = 600; // 10 minutes
  private static readonly GIG_LIST_TTL = 120; // 2 minutes

  /**
   * Get cached data
   */
  static async get<T>(key: string): Promise<T | null> {
    try {
      const data = await redis.get(key);
      if (!data) return null;
      return JSON.parse(data) as T;
    } catch (error) {
      console.error('Cache get error:', error);
      return null;
    }
  }

  /**
   * Set cached data with TTL
   */
  static async set(key: string, value: any, ttl: number): Promise<void> {
    try {
      await redis.setex(key, ttl, JSON.stringify(value));
    } catch (error) {
      console.error('Cache set error:', error);
    }
  }

  /**
   * Delete cached data
   */
  static async delete(key: string): Promise<void> {
    try {
      await redis.del(key);
    } catch (error) {
      console.error('Cache delete error:', error);
    }
  }

  /**
   * Delete multiple keys matching a pattern using SCAN (non-blocking)
   */
  static async deletePattern(pattern: string): Promise<void> {
    try {
      // Use SCAN instead of KEYS to avoid blocking Redis
      let cursor = '0';
      const keysToDelete: string[] = [];
      
      do {
        // SCAN returns [cursor, keys]
        const reply = await redis.scan(cursor, 'MATCH', pattern, 'COUNT', 100);
        cursor = reply[0];
        const keys = reply[1];
        
        if (keys && keys.length > 0) {
          keysToDelete.push(...keys);
        }
        
        // Delete in batches to avoid memory issues
        if (keysToDelete.length >= 100) {
          await redis.del(...keysToDelete);
          keysToDelete.length = 0; // Clear array
        }
      } while (cursor !== '0');
      
      // Delete remaining keys
      if (keysToDelete.length > 0) {
        await redis.del(...keysToDelete);
      }
    } catch (error) {
      console.error('Cache delete pattern error:', error);
    }
  }

  // Profile caching methods
  static async getProfile(userId: string) {
    return this.get(`profile:${userId}`);
  }

  static async setProfile(userId: string, profile: any): Promise<void> {
    await this.set(`profile:${userId}`, profile, this.PROFILE_TTL);
  }

  static async invalidateProfile(userId: string): Promise<void> {
    await this.delete(`profile:${userId}`);
  }

  // Nearby users caching methods
  static async getNearbyUsers(lat: number, lng: number, radius: number) {
    const key = `nearby:${lat.toFixed(4)}:${lng.toFixed(4)}:${radius}`;
    return this.get(key);
  }

  static async setNearbyUsers(
    lat: number,
    lng: number,
    radius: number,
    users: any
  ): Promise<void> {
    const key = `nearby:${lat.toFixed(4)}:${lng.toFixed(4)}:${radius}`;
    await this.set(key, users, this.NEARBY_USERS_TTL);
  }

  // Search results caching
  static async getSearchResults(queryHash: string) {
    return this.get(`search:${queryHash}`);
  }

  static async setSearchResults(queryHash: string, results: any): Promise<void> {
    await this.set(`search:${queryHash}`, results, this.SEARCH_RESULTS_TTL);
  }

  // Friendship caching
  static async getFriendship(userId1: string, userId2: string) {
    const key = `friendship:${[userId1, userId2].sort().join(':')}`;
    return this.get(key);
  }

  static async setFriendship(userId1: string, userId2: string, friendship: any): Promise<void> {
    const key = `friendship:${[userId1, userId2].sort().join(':')}`;
    await this.set(key, friendship, this.FRIENDSHIP_TTL);
  }

  static async invalidateFriendship(userId1: string, userId2: string): Promise<void> {
    const key = `friendship:${[userId1, userId2].sort().join(':')}`;
    await this.delete(key);
  }

  static async invalidateUserFriendships(userId: string): Promise<void> {
    await this.deletePattern(`friendship:*${userId}*`);
  }

  // Gig list caching
  static async getGigList(filters: string) {
    return this.get(`gigs:${filters}`);
  }

  static async setGigList(filters: string, gigs: any): Promise<void> {
    await this.set(`gigs:${filters}`, gigs, this.GIG_LIST_TTL);
  }

  static async invalidateGigLists(): Promise<void> {
    await this.deletePattern('gigs:*');
  }

  /**
   * Generate hash for search query (for cache key)
   */
  static generateQueryHash(query: any): string {
    return Buffer.from(JSON.stringify(query)).toString('base64');
  }
}
