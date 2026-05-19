# Polaris Roadmap

This file is the project tracker while Polaris is being built without a separate tool.

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
- `[ ]` Install dependencies and generate lockfile
- `[ ]` Verify app boots on web
- `[ ]` Verify app boots in Expo Go or a development build

### Backend Setup

- `[ ]` Create Supabase project
- `[ ]` Add Supabase client package
- `[ ]` Configure environment variables
- `[ ]` Create initial database migration
- `[ ]` Enable Row Level Security policies

### Authentication

- `[ ]` Build sign up, sign in, and sign out flows
- `[ ]` Create profile row on signup
- `[ ]` Add protected app routes

### Trade Logging

- `[ ]` Create trade schema
- `[ ]` Build manual trade-entry form
- `[ ]` Support open and closed trade states
- `[ ]` Calculate realized P&L
- `[ ]` Add trade list and trade detail screens

### Screenshots and Tags

- `[ ]` Add chart screenshot uploads
- `[ ]` Store screenshots in Supabase Storage
- `[ ]` Add strategy, emotion, mistake, and setup tags
- `[ ]` Add tag filters

### Dashboard

- `[ ]` Add total realized P&L
- `[ ]` Add win rate
- `[ ]` Add average win/loss
- `[ ]` Add profit factor
- `[ ]` Add simple equity curve

## Phase 2: V2 Expansion

- `[ ]` Broker import architecture
- `[ ]` Advanced equity curve analytics
- `[ ]` Drawdown and rolling performance reports
- `[ ]` Position sizing calculator
- `[ ]` Max daily loss and risk alerts
- `[ ]` Shareable trade review links
- `[ ]` Mentor/social review workflow

## Decision Log

| Date | Decision | Rationale |
| --- | --- | --- |
| 2026-05-19 | Use Expo + React Native + Expo Router | One TypeScript codebase for web, iOS, and Android. |
| 2026-05-19 | Use Supabase/PostgreSQL for backend | Strong fit for relational trade history and financial analytics. |
| 2026-05-19 | Track work in `docs/tasks/roadmap.md` | Keeps product planning in git until a dedicated project tracker is needed. |
