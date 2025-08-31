# Repository Guidelines

## Project Structure & Module Organization
- apps/web: Next.js 14 (App Router) app. UI pages, API routes, Tailwind styles.
- packages/ui: Reusable React components (PascalCase in `components/`).
- packages/lib: Business logic, RBAC, schemas, audit, rate limiting.
- packages/db: Prisma schema, seeds, SQL helpers. Prisma client re-export.
- packages/config: Shared ESLint, Tailwind, and TypeScript configs.

## Build, Test, and Development Commands
- Install: `pnpm install` (Node >= 18, pnpm 9).
- Dev (all apps): `pnpm dev` → runs `turbo dev` (Next dev at 3000).
- Dev (web only): `pnpm --filter web dev`.
- Build: `pnpm build` → turborepo builds all outputs.
- Lint: `pnpm lint` → Next/ESLint across packages (auto-fix in web).
- Type check: `pnpm type-check`.
- Tests: `pnpm test` (currently focused in `packages/lib`).
- Database: `pnpm db:generate | db:push | db:migrate | db:seed` (runs in `packages/db`). Prisma Studio: `pnpm --filter @cebu-health/db db:studio`.

## Coding Style & Naming Conventions
- TypeScript strict settings; path aliases: `@/*` (web app), `@cebu-health/*` (packages).
- ESLint extends `next/core-web-vitals` + TypeScript plugin; `no-explicit-any`, `no-non-null-assertion`, and `no-unused-vars` enforced; `no-console` warns. This means I don't want `any` as types, I also permit you to read relevant node modules to be able to type `any` stuffs.
- React components: PascalCase filenames (`KPICard.tsx`, `TaskList.tsx`).
- Tailwind via shared config (`@cebu-health/config/tailwind`); design tokens in `apps/web/app/globals.css`.

## Testing Guidelines
- Framework: Jest in `packages/lib`. Add tests as `*.test.ts` or under `__tests__/` next to code.
- Run: `pnpm --filter @cebu-health/lib test` or root `pnpm test`.
- Aim for meaningful coverage on RBAC, schemas, and business rules. Snapshot UI only where stable.

## Commit & Pull Request Guidelines
- Commits: short, imperative, and scoped (e.g., "Add clients page", "Fix TypeScript types in jobs").
- PRs must include: clear description, linked issues, screenshots for UI changes, and notes for Prisma schema or `.env` changes.
- Keep diffs focused; include `pnpm lint && pnpm type-check` passing.

## Security & Configuration Tips
- Copy `.env.example` to `.env.local` (and `packages/db/.env`) and set `DATABASE_URL`, OTP/SESSION secrets, provider keys. Never commit secrets.
- Headers and hardening live in `apps/web/next.config.js`. Cron/job secrets use `JOBS_HMAC_SECRET`.
- Turbo caches consider `**/.env.*local`; restart dev after env changes.
