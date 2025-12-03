import Redis from "ioredis";

// Create Redis client with connection to Redis server
// Falls back to in-memory Map if Redis is not available (for development)
let redis: Redis | null = null;

try {
  redis = new Redis(process.env.REDIS_URL || "redis://localhost:6379", {
    retryStrategy: (times) => {
      // Retry connection after 2 seconds
      if (times > 3) {
        console.warn("⚠️  Redis connection failed, falling back to in-memory storage");
        return null;
      }
      return 2000;
    },
    maxRetriesPerRequest: 3,
  });

  redis.on("error", (err) => {
    console.error("Redis error:", err);
  });

  redis.on("connect", () => {
    console.log("✅ Redis connected successfully");
  });
} catch (error) {
  console.warn("⚠️  Redis not available, using in-memory storage:", error);
}

// In-memory fallback maps
const inMemoryStorage = {
  userMap: new Map<string, any>(),
  captainMap: new Map<string, any>(),
  captainLoc: new Map<string, any>(),
  tripUserMap: new Map<string, any>(),
};

/**
 * Redis-backed storage service with in-memory fallback
 * This service provides a unified interface for storing WebSocket connections,
 * captain locations, and trip-user mappings
 */
export const redisService = {
  /**
   * Store WebSocket connection reference for a user
   */
  async setUserConnection(userId: string, connection: any): Promise<void> {
    if (redis) {
      // Store a flag in Redis (we can't store actual WS connections in Redis)
      await redis.hset("user:connections", userId, "connected");
    }
    inMemoryStorage.userMap.set(userId, connection);
  },

  /**
   * Get WebSocket connection for a user
   */
  getUserConnection(userId: string): any {
    return inMemoryStorage.userMap.get(userId);
  },

  /**
   * Remove user WebSocket connection
   */
  async deleteUserConnection(userId: string): Promise<void> {
    if (redis) {
      await redis.hdel("user:connections", userId);
    }
    inMemoryStorage.userMap.delete(userId);
  },

  /**
   * Store WebSocket connection reference for a captain
   */
  async setCaptainConnection(captainId: string, connection: any): Promise<void> {
    if (redis) {
      await redis.hset("captain:connections", captainId, "connected");
    }
    inMemoryStorage.captainMap.set(captainId, connection);
  },

  /**
   * Get WebSocket connection for a captain
   */
  getCaptainConnection(captainId: string): any {
    return inMemoryStorage.captainMap.get(captainId);
  },

  /**
   * Remove captain WebSocket connection
   */
  async deleteCaptainConnection(captainId: string): Promise<void> {
    if (redis) {
      await redis.hdel("captain:connections", captainId);
    }
    inMemoryStorage.captainMap.delete(captainId);
  },

  /**
   * Store captain location
   */
  async setCaptainLocation(captainId: string, lat: number, long: number): Promise<void> {
    const location = JSON.stringify({ lat, long });
    if (redis) {
      await redis.hset("captain:locations", captainId, location);
    }
    inMemoryStorage.captainLoc.set(captainId, { lat, long });
  },

  /**
   * Get captain location
   */
  async getCaptainLocation(captainId: string): Promise<{ lat: number; long: number } | null> {
    if (redis) {
      const location = await redis.hget("captain:locations", captainId);
      if (location) {
        return JSON.parse(location);
      }
    }
    return inMemoryStorage.captainLoc.get(captainId) || null;
  },

  /**
   * Store trip-user mapping
   */
  async setTripUser(tripId: string, userId: string): Promise<void> {
    if (redis) {
      await redis.hset("trip:users", tripId, userId);
    }
    inMemoryStorage.tripUserMap.set(tripId, userId);
  },

  /**
   * Get user ID for a trip
   */
  async getTripUser(tripId: string): Promise<string | null> {
    if (redis) {
      const userId = await redis.hget("trip:users", tripId);
      if (userId) return userId;
    }
    return inMemoryStorage.tripUserMap.get(tripId) || null;
  },

  /**
   * Remove trip-user mapping
   */
  async deleteTripUser(tripId: string): Promise<void> {
    if (redis) {
      await redis.hdel("trip:users", tripId);
    }
    inMemoryStorage.tripUserMap.delete(tripId);
  },

  /**
   * Close Redis connection gracefully
   */
  async close(): Promise<void> {
    if (redis) {
      await redis.quit();
    }
  },
};

export { redis };
