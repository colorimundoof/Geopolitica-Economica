# Geopolítica Econômica

Simulador econômico mensal para administrar políticas, pesquisa e desafios de seis países.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 5000)
- `pnpm --filter @workspace/geopolitica-economica run dev` — run the browser game
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `DATABASE_URL` is used by the shared API server; the game itself has no backend requirement.

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `artifacts/geopolitica-economica/src/engine/` — pure economic simulation and game rules.
- `artifacts/geopolitica-economica/src/engine/config.ts` — coefficients and limits.
- `artifacts/geopolitica-economica/src/data/` — countries, research projects, and events.
- `artifacts/geopolitica-economica/src/App.tsx` and `src/index.css` — browser game interface.

## Architecture decisions

- The first milestone is browser-only; campaigns are versioned in local storage.
- Economic rules are deterministic, pure functions and use the seeded Mulberry32 generator for events and currency shocks.
- Milestone 2 is implemented in the engine: continuous country-risk spread (`engine/risk.ts`) with the rating as a hysteresis label of that spread, capital flight, foreign-currency debt revaluation, credit defaults (NPL) with a lasting drag, and a lag on real-rate effects. Saves are version 2.

## Product

Choose one of six countries, set fiscal and monetary policies, prioritize research, handle seeded events, and track monthly economic outcomes and victory or defeat conditions.

## User preferences

The interface and in-game messages are in Brazilian Portuguese.

## Gotchas

- The game has no server-side save; clearing browser storage removes the local campaign.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
