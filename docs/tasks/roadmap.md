# Polaris Roadmap

This file is the high-level product roadmap. Detailed execution lives in `current.md` and `backlog.md`.

## Status Legend

- `[ ]` Not started
- `[~]` In progress
- `[x]` Done

## Phase 1: V1 MVP

### Foundation

- `[x]` Create Expo + React Native project shell
- `[x]` Configure Expo Router entry point
- `[x]` Configure TypeScript strict mode and path alias
- `[x]` Add web, iOS, and Android app configuration
- `[x]` Add in-repo task tracking
- `[x]` Install dependencies and generate lockfile
- `[x]` Verify app boots on web
- `[x]` Verify app boots in Expo Go or a development build

### Backend Setup

- `[x]` Create Supabase project and add local env values
- `[x]` Add Supabase client package and shared client module
- `[x]` Create initial database migration
- `[x]` Enable Row Level Security policies
- `[x]` Apply core migration to Supabase
- `[x]` Verify RLS behavior

### Authentication

- `[x]` Build sign up, sign in, and sign out flows
- `[x]` Create profile row on signup
- `[x]` Add protected app routes

### Trade Logging

- `[x]` Create trade schema
- `[x]` Build manual trade-entry form
- `[x]` Support open and closed trade states
- `[x]` Calculate realized P&L
- `[x]` Add trade list and trade detail screens

### Screenshots and Tags

- `[x]` Add chart screenshot uploads
- `[x]` Store screenshots in Supabase Storage
- `[x]` Add strategy, emotion, mistake, and setup tags
- `[x]` Add tag filters

### Dashboard

- `[x]` Add total realized P&L
- `[x]` Add win rate
- `[x]` Add average win/loss
- `[x]` Add profit factor
- `[x]` Add simple equity curve

## Phase 2: V2 Expansion

- `[x]` Insight Coach for deterministic performance focus
- `[x]` Multiple trading accounts with dashboard selection
- `[x]` Account-agnostic strategies for manual trade logging
- `[ ]` Broker import architecture
- `[ ]` Advanced equity curve analytics
- `[ ]` Drawdown and rolling performance reports
- `[x]` Position sizing calculator
- `[ ]` Max daily loss and risk alerts
- `[ ]` Shareable trade review links
- `[ ]` Mentor/social review workflow

## Decision Log

| Date | Decision | Rationale |
| --- | --- | --- |
| 2026-05-19 | Use Expo + React Native + Expo Router | One TypeScript codebase for web, iOS, and Android. |
| 2026-05-19 | Use Supabase/PostgreSQL for backend | Strong fit for relational trade history and financial analytics. |
| 2026-05-19 | Track work in `docs/tasks/roadmap.md` | Keeps product planning in git until a dedicated project tracker is needed. |
| 2026-05-19 | Add an RLS event trigger guardrail | Future `public` tables should have RLS enabled automatically, while policies remain explicit. |
