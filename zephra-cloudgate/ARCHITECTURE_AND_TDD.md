# Zephra CloudGate: System Architecture and TDD Design

## 1. Overview

Zephra CloudGate is a full-stack web application built from a custom Node server that joins:

- `Next.js` frontend app in `src/app/`
- `NestJS` backend API in `server/backend/`
- `Prisma` SQLite persistence in `prisma/`
- custom server entry in `server/index.ts`

The app is delivered as one deployable Node application, with frontend SSR handled by Next.js and backend routes handled by NestJS under `/api/v1`.

## 2. Runtime Architecture

### 2.1 Entry point

- `server/index.ts`
  - Loads `.env` from current or parent directory
  - Creates an Express `server`
  - Creates a second Express app `apiServer`
  - Boots Next.js via `next.default({ dev, hostname, port })`
  - Boots NestJS via `NestFactory.create(AppModule, new ExpressAdapter(apiServer))`
  - Mounts:
    - `/uploads` → static file serving from uploads directory
    - `/api` → NestJS API app
    - all other routes → Next.js request handler

### 2.2 Request flow

- `GET /api/v1/...` → handled by NestJS controllers
- `GET /uploads/...` → static files from `UPLOADS_DIR`
- all other HTTP requests → served by Next.js

### 2.3 Data storage

- `Prisma` uses SQLite via `@prisma/adapter-better-sqlite3`
- database file path resolves from `DATABASE_URL`
- `PrismaService` ensures directory exists and connects on module init

## 3. Backend Layer

### 3.1 App composition

The NestJS module graph is composed in `server/backend/app.module.ts`:

- `ConfigModule` global configuration
- `PrismaModule` global Prisma provider
- `AuthModule`
- `SetupModule`
- `DashboardModule`
- `ApplicationsModule`
- `TunnelsModule`
- `UsersModule`
- `CloudflareModule`
- `DevicesModule`
- `PoliciesModule`
- `ListsModule`
- `DomainsModule`
- `DnsModule`
- `FirewallModule`
- `LogsModule`

### 3.2 Common backend contract

- `server/backend/shared/types.ts` defines shared DTOs and response shapes.
- `RequestResponse<T>` is used across controllers to standardize API responses.
- `HttpExceptionFilter` maps NestJS exceptions into consistent JSON error payloads.

### 3.3 Auth flow

- `AuthController` exposes:
  - `POST /api/v1/auth/login`
  - `POST /api/v1/auth/setup`
  - `GET /api/v1/auth/me`
- `AuthService` performs:
  - password validation using `bcrypt`
  - JWT token generation with `JwtService`
  - first-time admin creation guarded by existing-admin check
- `JwtStrategy` validates Bearer tokens and exposes user payload via `JwtAuthGuard`

### 3.4 Setup flow

- `SetupController` exposes setup endpoints and upload handling.
- `SetupService` stores configuration in the `Configuration` table.
- Sensitive values are encrypted using utility crypto helpers.
- Setup supports:
  - Cloudflare credentials
  - SMTP config
  - server profile
  - setup verification
  - setup complete flag
  - reset database
  - legacy config migration from `config.json`

### 3.5 Application / Cloudflare orchestration

- `ApplicationsController` handles CRUD for local application records.
- `ApplicationsService` performs:
  - health checks for application destinations
  - validation of destination URLs
  - creation of DNS and Cloudflare Access app configuration
  - persistence of Cloudflare-created IDs in local DB
- `CloudflareService` is the external integration point for Cloudflare API calls.
- `DnsService` is responsible for DNS record management.

### 3.6 Additional domains

The architecture includes domain-specific modules for:

- Devices and posture data
- Firewall policies and metadata
- Tunnels and tunnel configuration
- Logs and monitoring data
- Dashboard metrics and system stats
- Lists and reusable list management
- Domains and DNS operations

## 4. Data Model

`prisma/schema.prisma` defines three core tables:

- `User`
  - id, email, name, role, password, cloudflareId, createdAt, updatedAt
- `Application`
  - id, name, logoUrl, publicUrl, destinationType, destinationUrl, exposureType, tunnelId, dnsRecordId, createdAt, updatedAt
- `Configuration`
  - id, name, value

This is a small relational model built for:

- authentication and user roles
- local app state and Cloudflare IDs
- persistent encrypted configuration

## 5. Frontend Architecture

### 5.1 Next.js app structure

- `src/app/` contains route pages and client-side screens
- `src/components/` contains reusable UI components
- `src/lib/api.ts` contains centralized HTTP client code

### 5.2 API client layer

- `src/lib/api.ts` creates an Axios client with:
  - JSON request defaults
  - request interceptor that attaches JWT from `localStorage`
  - response interceptor normalizing the `RequestResponse` payload
  - 401 handling that clears auth state and redirects to login
- All frontend screens call these functions rather than raw endpoints.

### 5.3 Auth and navigation

- `src/app/login/page.tsx` checks auth token in `localStorage`
- If token exists, redirects to `/dashboard`
- Otherwise renders `LoginPage`

### 5.4 Important user flows

Frontend pages appear to support:

- login and admin setup
- dashboard system summary and metrics
- application management
- tunnel management
- firewall rule creation and listing
- user management
- device monitoring
- setup/configuration pages
- Cloudflare / DNS import and management

## 6. Build and Deployment

### 6.1 Build command

`package.json` defines:

- `npm run build`
  - `npm run prisma:generate`
  - `next build`
  - `tsc -p tsconfig.server.json`
- `npm start`
  - runs compiled server at `dist-server/server/index.js`

### 6.2 Release bundle

A release bundling script has been added in `scripts/create-release.js` to create a deployable package containing:

- compiled frontend `.next/`
- compiled backend `dist-server/`
- `public/`
- Prisma schema and config
- `package.json`, `package-lock.json`
- `scripts/init-sqlite.js`
- startup scripts `run.sh`, `run.ps1`, `start.sh`, `start.ps1`

### 6.3 Runtime requirements

- Node.js 18+ environment
- SQLite file system access
- `.env` containing secrets and paths
- optional `data/uploads` folder

## 7. Test-Driven Development (TDD) Strategy

### 7.1 Current test state

- Only one unit test exists: `server/backend/app.controller.spec.ts`
- No dedicated frontend tests are present
- No integration or system tests are currently implemented

### 7.2 TDD goals

1. Build confidence in backend business logic and API contracts.
2. Protect auth, setup, and Cloudflare orchestration flows.
3. Ensure frontend pages correctly consume the API layer.
4. Provide regression coverage for setup, login, and management workflows.
5. Separate unit tests from integration and system tests.

### 7.3 Recommended test stack

- Unit tests: `jest` or `vitest`
- HTTP integration: `supertest`
- React components: `@testing-library/react`
- E2E / browser: `Playwright` or `Cypress`
- Mocks: `jest-mock`, `nock` or `msw`

### 7.4 Backend unit test strategy

#### 7.4.1 Services

Create isolated unit tests for:

- `AuthService`
  - validate valid credentials
  - reject invalid credentials
  - create admin only when no admin exists
  - sign JWT payload shape
- `SetupService`
  - save/get Cloudflare config
  - save/get SMTP config
  - complete setup state
  - reset database behavior against in-memory SQLite or mocked Prisma
  - legacy config migration when `config.json` exists
- `ApplicationsService`
  - health status logic for valid/invalid URLs
  - `findAll()` returns application list with health
  - `create()` path should call DNS/Cloudflare mocks and persist data
- `PrismaService`
  - path resolution of `DATABASE_URL`
  - directory creation side effects
- `CloudflareService` and `DnsService`
  - verify API request composition
  - response shaping and error handling

#### 7.4.2 Controllers

Add tests for API controllers using Nest test module and mocked providers:

- `AuthController`
- `SetupController`
- `ApplicationsController`
- `TunnelsController`
- `UsersController`
- `FirewallController`

Validate:

- route guards
- happy path response shapes
- error handling mapping from services

#### 7.4.3 Utilities

Test helper functions and crypto utilities:

- encryption/decryption symmetry
- config value normalization
- error response formatting

### 7.5 Integration test strategy

#### 7.5.1 API integration

Use `supertest` against a Nest application instance or the combined Express server.

Key scenarios:

- login and auth token issuance
- protected route access with valid/invalid JWT
- setup workflow and `setup/status`
- create/read/update/delete application records
- health status and destination validation behavior
- file upload to `/setup/upload-logo`

#### 7.5.2 Database and Prisma

- Use a test SQLite database or in-memory SQLite file
- Spin up a fresh schema before each test suite
- Seed minimal data for users and application state
- Assert database state after controller calls

### 7.6 System / E2E test strategy

#### 7.6.1 UI workflows

Use browser automation for critical user journeys:

- initial setup and admin creation
- login flow and token persistence
- dashboard page load and summary display
- create/edit/delete application
- tunnel management page
- firewall policy creation page
- setup verification and configuration screens

#### 7.6.2 API-driven acceptance

Use API-first tests for:

- end-to-end auth token acquisition
- session expiry and 401 redirect behavior
- full setup completion lifecycle
- Cloudflare config persistence and retrieval

### 7.7 Test architecture and file layout

Suggested directories:

- `server/backend/**/*.spec.ts` for backend unit tests
- `server/backend/**/*.integration-spec.ts` for API integration tests
- `src/components/**/*.test.tsx` for React component tests
- `e2e/**` for Playwright/Cypress tests

### 7.8 Sample test targets

Minimum recommended test suite:

- `AuthService` unit tests
- `AuthController` integration tests
- `SetupService` unit tests
- `SetupController` integration tests
- `ApplicationsService` unit tests
- `ApplicationsController` CRUD tests
- `API client interceptor` response normalization tests
- `LoginPage` auth redirect test
- `Dashboard` rendering and data loading test

### 7.9 Release and quality metrics

Recommended coverage focus:

- 80% coverage on service and controller layers
- 100% coverage for auth and setup critical paths
- E2E pass rate for core workflow scenarios
- Static analysis on TypeScript and linting

## 8. Recommended next steps

1. Add a test runner and config (`jest.config.js` or `vitest.config.ts`).
2. Add mocks for Prisma and external HTTP dependencies.
3. Create targeted unit tests for `AuthService`, `SetupService`, and `ApplicationsService`.
4. Add one integration suite around the Nest API using `supertest`.
5. Add one browser-based system test for login and dashboard flow.
6. Review and refine the data model if new features require extra tables.

## 9. Observations and risks

### 9.1 Observations

- Single-process custom server is easy to deploy, but mixes frontend and backend hosting.
- The app currently relies on SQLite and local uploads, which is fine for small deployments.
- Cloudflare integration is central; those external APIs should be mocked heavily in tests.
- Only one existing test exists, so the test coverage baseline is very low.

### 9.2 Risks

- Uncovered runtime behavior in `ApplicationsService.create()` due to external Cloudflare and DNS state.
- Setup flow depends on encrypted configuration, so encryption key correctness is important.
- User auth and token propagation in frontend are currently only handled in localStorage, which should be validated in UI tests.

---

This document is intentionally anchored to the actual repo structure and current code paths. It can be used as the basis for implementing a formal architecture/design spec and a full TDD roadmap.
