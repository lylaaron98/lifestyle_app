# Lifestyle App Architecture

## Purpose
This document explains how the repository is organized, how the application runs end-to-end, and the recommended development process for local and collaborative work.

## System Overview
The project is a pnpm monorepo centered around a lifestyle product with:
- A mobile-first client (Expo + React Native, including web preview)
- An API server (Express + TypeScript)
- Shared libraries for API contracts, client generation, validation, database access, and integrations

At a high level:
1. The mobile app manages local UX state and calls backend endpoints for AI features.
2. The API server exposes REST routes and orchestrates AI/business logic.
3. Shared packages keep API and type contracts consistent across client and server.

## Repository Structure
- `README.md`: Top-level repository description.
- `Life-Organizer/`: Monorepo root (all runtime packages and tooling).

Within `Life-Organizer/`:
- `artifacts/mobile/`: Expo Router mobile app (tabs, screens, context, hooks).
- `artifacts/api-server/`: Express API service (`src/app.ts`, route modules, middleware).
- `lib/api-spec/`: OpenAPI specification and codegen config.
- `lib/api-client-react/`: Generated/maintained API client for frontend use.
- `lib/api-zod/`: Zod validators and generated schema types.
- `lib/db/`: Database config, schema, and Drizzle setup.
- `lib/integrations*`: External provider integrations (including OpenAI modules).
- `scripts/`: Workspace utility scripts.

## Architectural Boundaries
- Presentation layer:
  - Implemented in `artifacts/mobile/app/` and `artifacts/mobile/components/`.
  - Responsible for navigation, interaction, and local UX behavior.
- Application/state layer:
  - Primarily in `artifacts/mobile/context/` and feature screens.
  - Owns local state transitions and user-driven actions.
- API layer:
  - Implemented in `artifacts/api-server/src/routes/`.
  - Defines request/response boundaries and business endpoints.
- Domain/data contracts:
  - OpenAPI contract in `lib/api-spec/openapi.yaml`.
  - Generated clients/schemas in `lib/api-client-react` and `lib/api-zod`.
- Persistence layer:
  - Database schema and access in `lib/db` (Drizzle + Postgres).
- Integration layer:
  - Third-party AI and service connectors in integration libraries.

## Request/Data Flow
Typical flow for AI-assisted user actions:
1. User action originates in a mobile tab/screen.
2. Client sends request to API route (for example AI chat endpoint).
3. API route validates/parses payload, composes domain context.
4. Integration package calls external AI provider.
5. API returns structured response and optional action payload.
6. Mobile app updates local state/UI based on response.

The same pattern is expected for non-AI data features, with database-backed operations in API handlers where applicable.

## Development Process
Recommended development loop:
1. Define or update API contract first in `lib/api-spec/openapi.yaml`.
2. Regenerate typed clients/schemas (`api-client-react`, `api-zod`).
3. Implement/adjust API route behavior in `artifacts/api-server`.
4. Build UI behavior in `artifacts/mobile` using typed client contracts.
5. Run type checks and targeted manual validation (web preview and device).

## Local Workflow (Windows-friendly)
Prerequisites:
- Node.js (v22+ recommended for this repo)
- Corepack enabled
- pnpm activated via Corepack

Core commands from `Life-Organizer/`:
- `pnpm install`
- `pnpm --filter @workspace/mobile run dev:web` (web preview)
- `pnpm --filter @workspace/mobile run dev:local` (local Expo runtime)
- `pnpm --filter @workspace/mobile run dev:tunnel` (device testing over tunnel)
- `pnpm --filter @workspace/api-server run dev` (API server)
- `pnpm run typecheck`
- `pnpm run build`

## Build and Quality Gates
- Type safety:
  - Workspace-level TypeScript build/check commands validate package boundaries.
- Contract consistency:
  - OpenAPI plus generated clients/schemas reduces drift between server and client.
- Package boundaries:
  - Feature artifacts consume shared libs instead of duplicating contracts.

## Design Principles
- Contract-first APIs for safer iteration.
- Shared types and schemas to reduce runtime mismatch.
- Clear separation between UI, API, integrations, and persistence.
- Monorepo workflows to keep multi-package changes atomic.

## Current Known Technical Notes
- Some mobile typecheck errors can exist independently of runtime startup and should be resolved as part of ongoing cleanup.
- Local development on Windows requires allowing platform-appropriate optional native dependencies in pnpm setup.

## Suggested Near-Term Improvements
1. Add architecture decision records (ADRs) for major choices (Expo Router, contract-first API, DB strategy).
2. Add sequence diagrams for critical user journeys (AI chat, expense save, journal entry).
3. Add CI gates for API codegen drift detection and stricter mobile/server linting.
