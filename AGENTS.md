# Notes for AI coding assistants

- Stack: TanStack Start (React 19) + Tailwind 4, Clerk login, Neon Postgres. Plain Vite config in `vite.config.ts`.
- All database access goes through server functions in `src/lib/*.functions.ts`; the caller's id comes from Clerk (`requireUserId`), never from the request.
- Database changes are new numbered files in `neon/` (see `docs/SETUP.md`), never edits to files that were already run.
- Before finishing a change run: `bun run typecheck`, `bun run lint`, `bun run test`, `bun run build`.
- Every user-facing string uses `t("English", "हिन्दी")`.
