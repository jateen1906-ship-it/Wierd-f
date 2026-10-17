# Wierd — Social Food Evolution Platform

A community-driven platform for culinary exploration, recipe remixing, proof-of-cook submissions, and the Living Food Graph.

---

## Architecture & Technology Stack

- **Monorepo**: Turborepo, npm workspaces
- **Frontend (`apps/web`)**: Next.js 14 (App Router), React 18, Tailwind CSS, Lucide icons
- **Backend API (`apps/api`)**: NestJS 10, Prisma ORM, Passport JWT, Zod validation
- **Database**: PostgreSQL 15+
- **Cache**: Redis (optional / non-blocking)
- **Shared Packages (`packages/`)**:
  - `@food-evolution/types`: Core TypeScript domain types
  - `@food-evolution/validation`: Shared Zod validation schemas

---

## Local Development Quickstart

### 1. Prerequisites
- **Node.js**: v18.0.0 or higher
- **npm**: v9.0.0 or higher
- **Docker & Docker Compose** (for local PostgreSQL and Redis)

### 2. Start Local Infrastructure
```bash
# Start PostgreSQL (port 5433) and Redis (port 6380)
docker compose -f infra/docker/docker-compose.yml up -d
```

### 3. Install Dependencies
```bash
npm install
```

### 4. Configure Environment Variables
Copy the example environment files:
```bash
# Backend environment
cp apps/api/.env.example apps/api/.env

# Frontend environment
cp apps/web/.env.example apps/web/.env.local
```

### 5. Apply Database Migrations & Seed Data
```bash
# Apply Prisma migrations
cd apps/api
npx prisma migrate deploy

# Seed canonical culinary ingredients
npx prisma db seed
cd ../..
```

### 6. Start the Development Servers
```bash
# Start all applications concurrently via Turborepo
npm run dev

# Or run services individually:
# API (http://localhost:4000)
npm run dev --workspace=@food-evolution/api

# Frontend (http://localhost:3000)
npm run dev --workspace=@food-evolution/web
```

---

## Testing & Verification

```bash
# Run API unit test suite (18 suites, 157 tests)
npm test --workspace=@food-evolution/api

# Run Frontend unit test suite (18 suites, 123 tests)
npm test --workspace=@food-evolution/web

# Run API end-to-end test suite (8 suites, 104 tests)
npm run test:e2e --workspace=@food-evolution/api

# Run TypeScript typechecks across all packages
npm run typecheck

# Check code formatting with Prettier
npm run format:check

# Run Live 25-step Smoke Test
node tests/smoke-test.js

# Run Complete 13 Core User Journeys Test
node tests/step31-core-journeys.js

# Run Critical Edge Cases & Concurrency Test
node tests/step32-edge-cases.js
```

---

## Production Deployment & Launch Runbook

For production environment configuration, deployment steps, health checks, backup/recovery procedures, and the pre-flight launch checklist, please refer to:
👉 **[LAUNCH_CHECKLIST.md](LAUNCH_CHECKLIST.md)**