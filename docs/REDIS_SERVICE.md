# Redis Service Documentation

## Overview

The Redis service (`lib/redis.ts`) provides a unified interface for storing real-time state with automatic fallback to in-memory storage when Redis is unavailable.

## Architecture

### Hybrid Storage Pattern

The service uses a **hybrid storage pattern**:
- **Primary**: Redis (distributed, persistent)
- **Fallback**: In-memory Maps (local, ephemeral)

This ensures the application remains operational even when Redis is unavailable, making it ideal for:
- Development environments without Redis
- Graceful degradation during Redis outages
- Testing scenarios

## API Reference

### WebSocket Connection Storage

#### `setUserConnection(userId: string, connection: any)`
Store a WebSocket connection for a user.

```typescript
await redisService.setUserConnection("user-123", ws);
```

#### `getUserConnection(userId: string)`
Retrieve a user's WebSocket connection from in-memory storage.

```typescript
const ws = redisService.getUserConnection("user-123");
if (ws) {
  ws.send(JSON.stringify({ type: "notification", payload: "..." }));
}
```

### Captain Location Storage

#### `setCaptainLocation(captainId: string, lat: number, long: number)`
Store captain's current GPS coordinates.

```typescript
await redisService.setCaptainLocation("captain-456", 37.7749, -122.4194);
```

#### `getCaptainLocation(captainId: string)`
Retrieve captain's last known location.

```typescript
const location = await redisService.getCaptainLocation("captain-456");
// Returns: { lat: 37.7749, long: -122.4194 } or null
```

### Trip-User Mapping

#### `setTripUser(tripId: string, userId: string)`
Associate a trip with a user for real-time updates.

```typescript
await redisService.setTripUser("trip-789", "user-123");
```

## Data Structures in Redis

### Keys and Hash Maps

| Redis Key | Type | Purpose | Fields |
|-----------|------|---------|--------|
| `user:connections` | Hash | Track connected users | `userId` → `"connected"` |
| `captain:connections` | Hash | Track connected captains | `captainId` → `"connected"` |
| `captain:locations` | Hash | Store captain GPS data | `captainId` → `{"lat":X,"long":Y}` |
| `trip:users` | Hash | Map trips to users | `tripId` → `userId` |

## Best Practices

### 1. Always Use Async/Await

```typescript
// Good
await redisService.setCaptainLocation(captainId, lat, long);
```

### 2. Handle Null Returns

```typescript
const userId = await redisService.getTripUser(tripId);
if (!userId) {
  // Trip not found or completed
  return;
}
```

### 3. Clean Up on Completion

```typescript
// When trip completes
await redisService.deleteTripUser(tripId);
```

## Production Considerations

For production, use:
- **Redis Cluster** for horizontal scaling
- **Redis Sentinel** for automatic failover
- **Redis Persistence** (RDB + AOF) for data durability
