import redis from '../config/redis';

const SESSION_PREFIX = 'session:';
const SESSION_TTL = 86400; // 24 hours in seconds

export class SessionService {
  /**
   * Create a new session
   */
  static async createSession(userId: string, token: string): Promise<void> {
    const key = `${SESSION_PREFIX}${userId}`;
    await redis.setex(key, SESSION_TTL, token);
  }

  /**
   * Get session token
   */
  static async getSession(userId: string): Promise<string | null> {
    const key = `${SESSION_PREFIX}${userId}`;
    return await redis.get(key);
  }

  /**
   * Delete session (logout)
   */
  static async deleteSession(userId: string): Promise<void> {
    const key = `${SESSION_PREFIX}${userId}`;
    await redis.del(key);
  }

  /**
   * Refresh session TTL
   */
  static async refreshSession(userId: string, token: string): Promise<void> {
    const key = `${SESSION_PREFIX}${userId}`;
    await redis.setex(key, SESSION_TTL, token);
  }

  /**
   * Check if session exists
   */
  static async sessionExists(userId: string): Promise<boolean> {
    const key = `${SESSION_PREFIX}${userId}`;
    const exists = await redis.exists(key);
    return exists === 1;
  }

  /**
   * Get session TTL (time to live in seconds)
   */
  static async getSessionTTL(userId: string): Promise<number> {
    const key = `${SESSION_PREFIX}${userId}`;
    return await redis.ttl(key);
  }

  /**
   * Delete all sessions for a user (useful for security)
   */
  static async deleteAllUserSessions(userId: string): Promise<void> {
    const pattern = `${SESSION_PREFIX}${userId}*`;
    const keys = await redis.keys(pattern);
    if (keys.length > 0) {
      await redis.del(...keys);
    }
  }
}
