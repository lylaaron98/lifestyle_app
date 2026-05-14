# Lifestyle App Architecture

## Purpose
This document explains how the repository is organized, how the application runs end-to-end, and the recommended development process for local and collaborative work.

## System Overview
The project is a pnpm monorepo for a personal lifestyle management app with:
- A mobile-first client (Expo SDK ~54 + React Native, with web preview via Metro)
- An API server (Express + TypeScript) — scaffolded, not actively used at runtime
- Shared libraries for API contracts, client generation, validation, database access, and integrations

The mobile app is currently **self-contained**: all data is persisted locally via AsyncStorage and AI features call external providers directly from the client (no backend hop required for the current feature set).

## Repository Structure

```
lifestyle_app/            ← Git repo root
  .gitignore
  README.md
  Life-Organizer/         ← Monorepo root (all runtime packages and tooling)
    artifacts/
      mobile/             ← Expo Router app (the active product)
      api-server/         ← Express REST API (scaffolded)
      mockup-sandbox/     ← Vite + React component sandbox
    lib/
      api-spec/           ← OpenAPI contract + orval codegen config
      api-client-react/   ← Generated typed API client
      api-zod/            ← Generated Zod schemas
      db/                 ← Drizzle ORM schema + config
      integrations-openai-ai-react/   ← OpenAI hooks for React
      integrations-openai-ai-server/  ← OpenAI helpers for server
    scripts/              ← Workspace utility scripts
```

## Mobile App — Feature Tabs

The app uses **expo-router** file-based routing. All tab screens live in `artifacts/mobile/app/(tabs)/`.

| Tab file | Route name | Feature |
|---|---|---|
| `index.tsx` | Overview | Dashboard with personalised greeting, expense summary, savings progress, recent journal mood |
| `finance.tsx` | Finance | Segmented Expenses / Savings view; add, edit, delete, reorder expenses and savings pots |
| `calendar.tsx` | Calendar | Monthly calendar grid with Singapore public holidays (data.gov.sg), Google Calendar OAuth, custom iCal/ICS feeds |
| `journal.tsx` | Journal | Daily journal entries with mood rating (1–5), title, and free-text content |
| `ai.tsx` | AI | Chat assistant powered by Google Gemini or Groq (auto-detected by API key prefix); context-aware of user finances and profile |
| `settings.tsx` | Settings | User profile, appearance theme, preferences (currency, week start, financial goal), AI key management |

> `expenses.tsx` and `savings.tsx` have been removed — their functionality was consolidated into `finance.tsx`.

## State Management

All application state lives in `artifacts/mobile/context/AppContext.tsx` and is persisted to device storage via `@react-native-async-storage/async-storage`.

**Stored data:**

| Key | Type | Description |
|---|---|---|
| `@app/expenses` | `ExpenseItem[]` | Expenses and subscriptions |
| `@app/savings` | `SavingsPot[]` | Savings and investment pots |
| `@app/journal` | `JournalEntry[]` | Journal entries with mood |
| `@app/currency` | `string` | Selected currency symbol |
| `@app/geminiApiKey` | `string` | Gemini or Groq API key |
| `@app/profileName` | `string` | User display name |
| `@app/profileEmoji` | `string` | User avatar emoji |
| `@app/weekStart` | `"mon" \| "sun"` | Calendar week start preference |
| `@app/financialGoal` | `string` | Free-text financial goal |
| `@app/colorScheme` | `"light" \| "dark" \| "system"` | In-app theme override |

## Theming

- Color palettes (`light` and `dark`) defined in `artifacts/mobile/constants/colors.ts`.
- `useColors()` hook (`artifacts/mobile/hooks/useColors.ts`) resolves the active palette by reading the `colorScheme` override from `AppContext`, falling back to the device system scheme.
- All screens consume `useColors()` for consistent token-based styling.
- User can select Light / System / Dark in Settings → Appearance.

## AI Integration

The AI tab calls external LLM providers **directly from the client** (no backend required):

| Provider | Model | Key detection |
|---|---|---|
| Google Gemini | `gemini-2.0-flash` | Any key that does NOT start with `gsk_` |
| Groq | `llama-3.3-70b-versatile` | Keys starting with `gsk_` |

- Responses are requested in JSON mode and parsed into a structured `{ message, actions[] }` payload.
- The system prompt includes the user's profile name, financial goal, live expense/savings totals, recent journal moods, and currency.
- Both providers offer a free tier with no credit card required.

## Architectural Boundaries

- **Presentation layer** — `artifacts/mobile/app/` and `artifacts/mobile/components/`
- **State / application layer** — `artifacts/mobile/context/AppContext.tsx`
- **Theming layer** — `artifacts/mobile/constants/colors.ts` + `hooks/useColors.ts`
- **API layer** (scaffolded) — `artifacts/api-server/src/routes/`
- **Contract layer** — `lib/api-spec/openapi.yaml`, `lib/api-client-react`, `lib/api-zod`
- **Persistence layer** (scaffolded) — `lib/db` (Drizzle + Postgres)
- **Integration layer** — `lib/integrations-openai-ai-react`, `lib/integrations-openai-ai-server`

## Local Development Workflow

**Prerequisites:**
- Node.js v22+
- Corepack enabled (`corepack enable`)
- pnpm activated via Corepack

**All commands run from `Life-Organizer/`:**

```powershell
pnpm install

# Mobile app (web preview at http://localhost:8081)
pnpm --filter @workspace/mobile run dev:web

# Mobile app (Expo Go on device)
pnpm --filter @workspace/mobile run dev:local

# Mobile app (tunnel for external device access)
pnpm --filter @workspace/mobile run dev:tunnel

# API server
pnpm --filter @workspace/api-server run dev

# Type check entire workspace
pnpm run typecheck
```

**Git workflow (also from `Life-Organizer/`):**
```powershell
git add -A
git commit -m "description"
git push
```

> The repo root (`lifestyle_app/`) only contains `.git/`, `.gitignore`, `README.md`, and the `Life-Organizer/` subfolder. All project files are tracked under the `Life-Organizer/` path prefix in git.

## Design Principles
- Local-first: all user data stored on-device; no account or backend required to use the app.
- Token-based theming with light/dark/system support throughout.
- Provider-agnostic AI: key-prefix detection allows swapping LLM providers without UI changes.
- Monorepo structure keeps shared contracts, types, and tooling co-located for future backend expansion.

## Current Technical Notes
- The API server and shared lib packages (`api-spec`, `api-client-react`, `api-zod`, `db`) are scaffolded but not exercised at runtime — the mobile app operates fully client-side.
- Some TypeScript strict-mode warnings may exist in scaffolded packages independent of mobile runtime behaviour.
- Local development on Windows requires platform-appropriate optional native dependencies in pnpm setup (handled by `.npmrc` settings).

## Suggested Near-Term Improvements
1. Add architecture decision records (ADRs) for major choices (Expo Router, contract-first API, DB strategy).
2. Add sequence diagrams for critical user journeys (AI chat, expense save, journal entry).
3. Add CI gates for API codegen drift detection and stricter mobile/server linting.
