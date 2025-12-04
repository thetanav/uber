# Uber Clone 🚗

A full-stack ride-sharing application built with modern web technologies. Experience seamless trip booking, real-time tracking, and captain management in this comprehensive Uber-like platform.

![Node.js](https://img.shields.io/badge/Node.js-18+-green)
![TypeScript](https://img.shields.io/badge/TypeScript-5.9-blue)
![Next.js](https://img.shields.io/badge/Next.js-16-orange)
![Elysia](https://img.shields.io/badge/Elysia-latest-purple)
![Prisma](https://img.shields.io/badge/Prisma-7.0-cyan)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-latest-blue)
![Redis](https://img.shields.io/badge/Redis-latest-red)
![WebSockets](https://img.shields.io/badge/WebSockets-enabled-yellow)

## ✨ Features

- **Real-time Communication**: WebSocket-powered live updates for trip status, location tracking, and notifications
- **Dual App Experience**: Separate interfaces for riders (users) and drivers (captains)
- **Secure Authentication**: JWT-based auth with bcrypt password hashing
- **Database Management**: Prisma ORM with PostgreSQL for robust data handling
- **Caching & Performance**: Redis integration for session management and caching
- **OTP Verification**: Secure trip verification system
- **Location Services**: Precise GPS tracking with decimal coordinates
- **Trip Management**: Complete lifecycle from request to completion
- **Pooling Support**: Capacity-based trip sharing
- **Modern UI**: React 19 with custom UI components
- **Type Safety**: Full TypeScript coverage across the stack

## 🛠 Tech Stack

### Frontend

- **Next.js 16** - React framework with App Router
- **React 19** - Latest React with concurrent features
- **TypeScript** - Type-safe development
- **Custom UI Library** - Shared component library

### Backend

- **Elysia** - High-performance Bun-based web framework
- **Prisma** - Next-generation ORM
- **PostgreSQL** - Robust relational database
- **Redis** - In-memory data structure store
- **WebSockets** - Real-time bidirectional communication

### DevOps & Tools

- **Turbo** - High-performance build system for monorepos
- **Bun** - Fast JavaScript runtime and package manager
- **ESLint** - Code linting and formatting
- **Vitest** - Fast unit testing
- **Prettier** - Code formatting

## 🚀 Getting Started

### Prerequisites

- **Node.js** 18+
- **Bun** 1.3.2+
- **PostgreSQL** database
- **Redis** server

### Installation

1. **Clone the repository**

   ```bash
   git clone https://github.com/thetanav/uber.git
   cd uber
   ```

2. **Install dependencies**

   ```bash
   bun install
   ```

3. **Set up environment variables**

   Create `.env` files in the following directories:
   - `apps/server/.env`
   - `apps/captain/.env` (if needed)
   - `apps/user/.env` (if needed)

   Example `apps/server/.env`:

   ```env
   DATABASE_URL="postgresql://username:password@localhost:5432/uber_db"
   REDIS_URL="redis://localhost:6379"
   JWT_SECRET="your-super-secret-jwt-key"
   ```

4. **Set up the database**

   ```bash
   cd apps/server
   bunx prisma migrate dev
   bunx prisma generate
   ```

5. **Start development servers**

   ```bash
   # From project root
   bun run dev
   ```

   This will start all apps:
   - User App: http://localhost:3000
   - Captain App: http://localhost:3001
   - Server API: http://localhost:3002 (or configured port)

## 📁 Project Structure

```
uber/
├── apps/
│   ├── captain/          # Driver dashboard (Next.js)
│   ├── server/           # Backend API (Elysia + Prisma)
│   └── user/             # Rider app (Next.js)
├── packages/
│   ├── eslint-config/    # Shared ESLint configurations
│   ├── typescript-config/# Shared TypeScript configs
│   └── ui/               # Shared UI components
├── package.json
├── turbo.json
└── README.md
```

## 🎯 Usage

### For Riders

1. Sign up/login at http://localhost:3000
2. Enter trip details (origin, destination, capacity)
3. Book your ride and track in real-time
4. Use OTP for secure trip verification

### For Captains

1. Register at http://localhost:3001
2. Go online and accept ride requests
3. Navigate to pickup locations
4. Complete trips and earn

### API Endpoints

- `POST /auth/login` - User/Captain authentication
- `POST /user/trip` - Create new trip request
- `GET /captain/trips` - Get available trips
- `PUT /captain/trip/:id/accept` - Accept a trip
- `WS /ws` - Real-time updates

## 🧪 Testing

```bash
bun run test
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'Add amazing feature'`
4. Push to branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Inspired by Uber's seamless ride-sharing experience
- Built with cutting-edge web technologies
- Thanks to the open-source community for amazing tools

---

**Happy riding! 🚀**
