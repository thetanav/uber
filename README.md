# Uber Backend - Elysia with Bun Runtime

A modern ride-sharing backend built with Elysia framework and Bun runtime, featuring modular architecture and Redis support for real-time communication.

## Features

- 🚀 **Bun Runtime** - Fast JavaScript runtime with TypeScript support
- 🏗️ **Modular Architecture** - Clean separation of concerns with services, routes, and controllers
- 📦 **Redis Support** - Distributed state management with automatic in-memory fallback
- 🔌 **WebSocket** - Real-time communication between users and captains
- 🔐 **JWT Authentication** - Secure authentication for users and captains
- 🗄️ **PostgreSQL + Prisma** - Type-safe database access
- ✅ **Testing** - Unit tests with Vitest
- 🎨 **ESLint** - Code quality and consistency

## Architecture

### Directory Structure

```
├── lib/              # Core utilities and configurations
│   ├── jwt.ts        # JWT authentication plugin
│   ├── prisma.ts     # Database client
│   └── redis.ts      # Redis service with in-memory fallback
├── routes/           # API route handlers
│   ├── auth.ts       # Authentication endpoints
│   ├── captain.ts    # Captain-specific endpoints
│   ├── user.ts       # User-specific endpoints
│   └── trip.ts       # Trip matching endpoints
├── services/         # Business logic layer
│   ├── websocket.ts  # WebSocket connection management
│   └── trip.ts       # Trip operations (match, cancel, pickup, complete)
├── prisma/           # Database schema and migrations
└── src/              # Application entry point
    └── index.ts      # Main application setup
```

### Redis Integration

The application uses Redis for:
- **User/Captain WebSocket connections** - Track active real-time connections
- **Captain locations** - Store current GPS coordinates for real-time tracking
- **Trip-User mappings** - Associate trips with users for status updates

**Graceful Fallback**: If Redis is unavailable, the application automatically falls back to in-memory storage, ensuring continuous operation during development or Redis downtime.

## Prerequisites

- [Bun](https://bun.sh) >= 1.0
- PostgreSQL database
- Redis server (optional - will use in-memory fallback if not available)

## Getting Started

### 1. Install Dependencies

```bash
bun install
```

### 2. Configure Environment Variables

Create a `.env` file in the root directory:

```env
DATABASE_URL="postgresql://user:password@host:port/database"
JWT_SECRET="your_secure_jwt_secret_here"
PORT="3000"
REDIS_URL="redis://localhost:6379"
```

### 3. Set Up Database

```bash
# Generate Prisma client
bunx prisma generate

# Run migrations
bunx prisma migrate dev
```

### 4. Start Development Server

```bash
bun run dev
```

The server will start at `http://localhost:3000`

## API Endpoints

### Authentication

- `POST /auth/user-signup` - Register a new user
- `POST /auth/captain-signup` - Register a new captain
- `POST /auth/login-user` - User login
- `POST /auth/login-captain` - Captain login

### User Operations

- `POST /user/user/request` - Request a new trip
- `POST /user/master/cancel` - Cancel a trip

### Captain Operations

- `POST /captain/master/cancel` - Cancel a trip (captain)
- `POST /captain/captain/pickup` - Confirm trip pickup with OTP
- `POST /captain/captain/complete` - Mark trip as completed

### Trip Management

- `POST /trip/match` - Match a captain with a requested trip

### WebSocket

- `WS /realtime?token=<jwt_token>` - Real-time communication
  - **Message Types:**
    - `listen:user` - User subscribes to trip updates
    - `send:captain` - Captain sends location updates

## Testing

Run tests with Vitest:

```bash
bun test
```

## Linting

Check code quality:

```bash
bun run lint
```

## Production Best Practices

### Redis Setup

For production, ensure Redis is properly configured:
1. Use Redis Cluster or Sentinel for high availability
2. Configure appropriate eviction policies
3. Set up monitoring and alerting
4. Use TLS for Redis connections

### Environment Variables

- Never commit `.env` files to version control
- Use secure, randomly generated JWT secrets
- Configure proper database connection pooling
- Set appropriate CORS policies

### Deployment

1. Set `NODE_ENV=production`
2. Configure Redis URL for production instance
3. Run database migrations
4. Use process managers like PM2 or systemd

## Contributing

1. Follow the existing code structure
2. Write tests for new features
3. Run linter before committing
4. Update documentation for API changes

## License

MIT
