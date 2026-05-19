# Decisions

| Date | Decision | Rationale |
| --- | --- | --- |
| 2026-05-19 | Use Expo + React Native + Expo Router | One TypeScript codebase can target web, iOS, and Android. |
| 2026-05-19 | Use Supabase/PostgreSQL for backend | Relational data and SQL analytics fit trade history, P&L, tags, and future reporting. |
| 2026-05-19 | Use repo-based Markdown tracking first | It is free, versioned with code, easy for Codex to update, and lighter than Jira for a solo developer. |
| 2026-05-19 | Defer Jira and GitHub Projects | Revisit once recurring releases, external testers, or multiple collaborators create enough process demand. |
| 2026-05-19 | Treat Canvas as brainstorming, not canonical tracking | Canvas is useful for exploration but does not replace durable issue status, dependencies, and code-linked history. |
| 2026-05-19 | Add an automatic RLS guardrail in the database plan | Future public tables should have RLS enabled automatically when permissions allow it, while policies remain explicit. |
