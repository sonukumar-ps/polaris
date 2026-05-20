# Polaris Backlog

This backlog is ordered by milestone. Pull only the next ready items into `current.md`.

## V1: Foundation and Release Readiness

### SETUP-004: Add code quality baseline

- Type: Project Setup
- Status: Done
- Priority: P1
- Depends On: SETUP-002
- Acceptance Criteria:
  - Typecheck command passes.
  - Lint command is available or a follow-up task explains why it is deferred.
  - README documents the common development commands.
- Implementation Notes:
  - Keep tooling aligned with Expo defaults.
  - Added Expo ESLint config.
  - `npm run typecheck` passes.
  - `npm run lint` passes.

### SETUP-005: Add app configuration assets

- Type: Project Setup
- Status: Done
- Priority: P2
- Depends On: SETUP-002
- Acceptance Criteria:
  - App icon, adaptive icon, and web favicon are configured.
  - App still boots after asset references are added.
- Implementation Notes:
  - Defer until basic brand direction is clearer.
  - Added deterministic Polaris icon, adaptive icon, and favicon.
  - Removed the one-off asset generation script after assets were committed.
  - `npm run typecheck` and `npm run lint` pass after wiring assets.

## V1: Backend and Data

### DB-005: Add typed database contract

- Type: Backend
- Status: Done
- Priority: P1
- Depends On: DB-003E
- Acceptance Criteria:
  - App has generated or maintained TypeScript types for Supabase tables.
  - Supabase client uses the database type.
- Implementation Notes:
  - Completed by `DB-003E`; generated types live at `lib/database.types.ts`.

### DB-006: Add trade persistence service

- Type: Backend
- Status: Done
- Priority: P0
- Depends On: TRADE-001
- Acceptance Criteria:
  - Authenticated user can create and fetch their own trades.
  - Failed writes show a useful error.
  - RLS prevents cross-user access.
- Implementation Notes:
  - Keep the service small and query-focused.
  - Added typed trade service in `lib/trades/service.ts`.
  - Service requires the current Supabase user before writes and reads.
  - Manual trade creation creates or reuses an asset and creates or reuses the first active account when no account is supplied.
  - Trade reads filter by the authenticated user id and still rely on Supabase RLS as the enforcement boundary.
  - Verified with `npm run typecheck` and `npm run lint`.

## V1: Authentication

### AUTH-004: Add auth loading and error states

- Type: Frontend
- Status: Todo
- Priority: P1
- Depends On: AUTH-002
- Acceptance Criteria:
  - Session loading state is visually clear.
  - Auth errors are shown near the relevant form.
  - Network failures do not leave the UI stuck.
- Implementation Notes:
  - Avoid large component abstractions until patterns repeat.

## V1: Trade Logging

### TRADE-002: Persist manual trades

- Type: Feature
- Status: Done
- Priority: P0
- Depends On: DB-006
- Acceptance Criteria:
  - User can save a manual trade to Supabase.
  - Saved trades appear in a basic trade list.
  - User can open a trade detail view.
- Implementation Notes:
  - Save asset records before or during trade creation as needed.
  - Manual trade form now saves through the typed trade service.
  - Added saved trade list at `/trades`.
  - Added trade detail view at `/trades/[tradeId]`.
  - Verified with `npm run typecheck` and `npm run lint`.

### TRADE-003: Calculate realized P&L

- Type: Feature
- Status: Done
- Priority: P0
- Depends On: TRADE-002
- Acceptance Criteria:
  - Long and short realized P&L calculations are correct.
  - Fees are included in net P&L.
  - Calculation behavior is covered by tests or documented examples.
- Implementation Notes:
  - Keep formula logic in a pure helper.
  - Added pure `calculateRealizedPnl` helper.
  - Closed manual trades now persist `gross_pnl` and `net_pnl`.
  - Trade list and detail views surface realized net P&L.
  - Documented formula examples in `docs/trades/pnl-calculations.md`.
  - Verified with `npm run typecheck` and `npm run lint`.

### TRADE-004: Add simple tagging

- Type: Feature
- Status: Todo
- Priority: P0
- Depends On: TRADE-002
- Acceptance Criteria:
  - User can add strategy, emotion, mistake, setup, and custom tags.
  - Trades can be filtered by tag.
- Implementation Notes:
  - Use the many-to-many trade/tag model from the database plan.

### TRADE-005: Add chart screenshot uploads

- Type: Feature
- Status: Todo
- Priority: P0
- Depends On: TRADE-002
- Acceptance Criteria:
  - User can attach at least one image to a trade.
  - Image metadata is linked to the trade.
  - Storage access respects user ownership.
- Implementation Notes:
  - Use Supabase Storage and Expo image selection.

## V1: Dashboard

### DASH-001: Add basic P&L summary

- Type: Feature
- Status: Todo
- Priority: P0
- Depends On: TRADE-003
- Acceptance Criteria:
  - Dashboard shows realized P&L, trade count, win rate, average win, and average loss.
  - Metrics update from saved trades.
- Implementation Notes:
  - Start with client-side aggregation if the data set is small.

### DASH-002: Add simple equity curve

- Type: Feature
- Status: Todo
- Priority: P1
- Depends On: DASH-001
- Acceptance Criteria:
  - User sees a basic equity curve from closed trades or snapshots.
  - Empty state is useful when no trades exist.
- Implementation Notes:
  - Choose charting library after web and native constraints are verified.

## V2: Advanced Optimization

### V2-001: Broker import architecture

- Type: Feature
- Status: Todo
- Priority: P2
- Depends On: V1 launch feedback
- Acceptance Criteria:
  - Broker imports are modeled as provider adapters.
  - Imported executions can be reviewed before becoming trades.
- Implementation Notes:
  - Do not start before manual journaling proves useful.

### V2-002: Advanced analytics

- Type: Feature
- Status: Todo
- Priority: P2
- Depends On: DASH-002
- Acceptance Criteria:
  - Equity curve, drawdown, profit factor, expectancy, and tag cohorts are available.
- Implementation Notes:
  - Consider materialized views when query cost warrants it.

### V2-003: Risk management calculators

- Type: Feature
- Status: Todo
- Priority: P2
- Depends On: TRADE-003
- Acceptance Criteria:
  - User can calculate position size from account risk, stop distance, and asset price.
  - Risk settings can be reused while logging trades.
- Implementation Notes:
  - Keep calculators independent from broker integration.

### V2-004: Social and mentor sharing

- Type: Feature
- Status: Todo
- Priority: P2
- Depends On: Stable V1 trade detail view
- Acceptance Criteria:
  - User can create a private share link for a trade review.
  - Shared views do not expose unrelated account data.
- Implementation Notes:
  - Treat sharing as security-sensitive.
