# Polaris

Polaris is a cross-platform trade journal for logging trades, reviewing P&L, attaching chart screenshots, and finding repeatable trading patterns.

## Stack

- Expo SDK 54
- React Native 0.81
- React 19.1
- Expo Router
- TypeScript
- Supabase planned for Auth, PostgreSQL, Storage, and Edge Functions

## Getting Started

Install dependencies with your package manager of choice:

```sh
npm install
```

Start the universal app:

```sh
npm run start
```

Run platform targets:

```sh
npm run web
npm run ios
npm run android
```

Native development boot notes live in [`docs/dev/native-boot.md`](./docs/dev/native-boot.md).

Database setup and the schema ERD live in [`docs/backend`](./docs/backend/supabase-setup.md), including
[`docs/backend/erd.md`](./docs/backend/erd.md).

## Demo Data

Seed a realistic demo trader after `.env` has Supabase values:

```sh
npm run seed:demo
```

Then sign in with:

- Email: `demo@polaris.test`
- Password: `PolarisDemo123!`

The seed is repeatable. It refreshes demo accounts, trades, tags, snapshots, and chart screenshots for the demo user.

## Quality Checks

Run TypeScript:

```sh
npm run typecheck
```

Run ESLint:

```sh
npm run lint
```

## Project Tracking

Until a dedicated project tracker is introduced, work is tracked in [`docs/tasks`](./docs/tasks/README.md).

- [`docs/tasks/current.md`](./docs/tasks/current.md): next sequential work queue.
- [`docs/tasks/backlog.md`](./docs/tasks/backlog.md): groomed backlog by milestone.
- [`docs/tasks/roadmap.md`](./docs/tasks/roadmap.md): high-level V1/V2 roadmap.
- [`docs/tasks/decisions.md`](./docs/tasks/decisions.md): product and architecture decisions.
