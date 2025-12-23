# Agent Instructions for Uber Clone Repository

## Build/Lint/Test Commands

### Root Commands (Turbo Monorepo)

- **Build all apps**: `bun run build`
- **Lint all apps**: `bun run lint`
- **Type check all apps**: `bun run check-types`
- **Format code**: `bun run format`

### App-Specific Commands

- **Frontend apps (user/captain)**: `cd apps/{app-name} && bun run lint` (ESLint with --max-warnings 0)
- **Frontend apps type check**: `cd apps/{app-name} && bun run check-types` (Next.js typegen + tsc)
- **Server**: `cd apps/server && bun run lint` (ESLint on src/\*_/_.ts)
- **Server dev**: `cd apps/server && bun run dev` (Bun watch mode)

### Testing

- **Run all tests**: `bun run test` (when available)
- **Run single test file**: `cd apps/server && bunx vitest run path/to/test.spec.ts`
- **Run tests in watch mode**: `cd apps/server && bunx vitest`

## Code Style Guidelines

### TypeScript Configuration

- Strict mode enabled with `noUncheckedIndexedAccess: true`
- Target ES2022 with NodeNext module resolution
- Isolated modules and incremental builds disabled
- Full type safety required

### Import Conventions

- **Absolute imports**: Use `@/` prefix for app-internal imports (components, lib, hooks)
- **External packages**: Standard ES6 imports at top
- **Local files**: Relative imports with `./` or `../`
- **Barrel exports**: Use index.ts files for clean imports

### Naming Conventions

- **Components**: PascalCase (e.g., `UserProfile`, `TripCard`)
- **Files**: kebab-case (e.g., `user-profile.tsx`, `trip-card.tsx`)
- **Variables/Functions**: camelCase (e.g., `userData`, `handleSubmit`)
- **Types/Interfaces**: PascalCase (e.g., `User`, `TripStatus`)
- **Constants**: UPPER_SNAKE_CASE (e.g., `API_BASE_URL`)

### Code Structure

- **Components**: Functional components with hooks, prefer arrow functions
- **API routes**: RESTful endpoints with proper HTTP status codes
- **Error handling**: Use try/catch blocks, return proper error responses
- **Async operations**: Always use async/await over Promises
- **State management**: React hooks for local state, context for global

### Formatting & Linting

- **Prettier**: Default configuration, run `bun run format` before commits
- **ESLint**: TypeScript recommended rules + Prettier integration
- **Max warnings**: 0 allowed in CI (--max-warnings 0)
- **Turbo rules**: Warn on undeclared environment variables

### Testing Guidelines

- **Framework**: Vitest for backend, no frontend tests yet
- **Test files**: Place alongside source files with `.test.ts` or `.spec.ts`
- **Mocking**: Use Vitest globals and environment: 'node'
- **Coverage**: Aim for critical path coverage

### Security & Best Practices

- **Environment variables**: Never commit secrets, use .env files
- **Authentication**: JWT tokens with proper validation
- **Input validation**: Use Elysia schemas for API validation
- **CORS**: Properly configured for frontend origins
- **HTTPS**: Enable secure cookies in production

### Git Workflow

- **Commits**: Use conventional commit messages
- **Branches**: Feature branches from main
- **PRs**: Require lint + type checks to pass</content>
  <parameter name="filePath">/home/thetanav/Code/project/uber/AGENTS.md
