# Denge

Türkçe bir sağlıklı yaşam uygulaması: kullanıcılar öğünlerini, aktivitelerini, kilo geçmişlerini, su ve uyku kayıtlarını güvenli hesaplarında saklar ve günlük hedeflerini takip eder.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the shared API server
- `pnpm --filter @workspace/denge run dev` — run the Denge web app
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — provisioned PostgreSQL connection
- Clerk auth variables are provisioned by Replit's managed Clerk setup.

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5, Clerk session cookies
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `artifacts/denge/src/` — Turkish React + Vite app
- `artifacts/api-server/src/routes/denge.ts` — authenticated Denge API
- `lib/api-spec/openapi.yaml` — API contract source of truth
- `lib/db/src/schema/` — PostgreSQL tables and ownership relationships
- `lib/api-client-react/src/generated/` — generated React Query hooks

## Architecture decisions

- Clerk provides account sign-in; the Clerk user ID is the owner key for each private health record.
- Food catalog entries are shared estimates; meals, activity, daily logs, goals, and weights are user-owned.
- Step counts are entered manually. The app does not claim to read device sensors.
- Calendar dates use `YYYY-MM-DD` strings from the browser through the API to PostgreSQL.

## Product

Denge provides a daily nutrition summary, meal and food logging, manual step/activity records, weight history, water and sleep tracking, and personal targets. Its interface is in Turkish and adapts to mobile and desktop screens.

## User preferences

- Keep all product-facing interface text in Turkish.
- Use a cream, sage, and olive palette with a polished, calm wellness feel.
- Clearly label nutritional and calorie estimates; do not claim device-based step tracking without a real integration.

## Gotchas

- Update `lib/api-spec/openapi.yaml` before changing API contracts, then run codegen before using generated types.
- All private API routes must derive the user ID from Clerk and scope database reads/writes to that ID.
- Use the shared proxy paths for the API and Clerk frontend proxy; do not hardcode service ports in the app.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
