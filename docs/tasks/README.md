# Polaris Task System

Polaris uses repo-based Markdown tracking as the source of truth until a dedicated tracker is worth the overhead.

## Files

- `current.md`: the short sequential queue for the work that should happen next.
- `backlog.md`: the full groomed backlog, grouped by milestone.
- `roadmap.md`: high-level V1/V2 roadmap, not the working board.
- `decisions.md`: product and architecture decisions that should survive context switches.

## Workflow

1. Work from the top of `current.md`.
2. Move one task to `In Progress` before starting implementation.
3. After each completed task, mark it `Done` and append any discovered follow-up task.
4. Pull the next ready task from `backlog.md` into `current.md` when the queue gets short.
5. Keep secrets out of docs. Refer to env variable names only.

## Statuses

- `Todo`: ready or waiting for dependencies.
- `In Progress`: actively being worked.
- `Blocked`: cannot proceed without a decision, credential, tool, or external action.
- `Done`: acceptance criteria are met.

## Priorities

- `P0`: required for V1 to function.
- `P1`: important for quality, release confidence, or early usability.
- `P2`: useful but deferrable.

## Task Types

- `Project Setup`: tooling, repo, build, release, or tracking work.
- `Feature`: user-facing capability.
- `Backend`: database, auth, storage, policies, or server-side behavior.
- `Frontend`: screens, components, layout, and client state.
- `QA`: verification, testing, and release checks.
- `Chore`: maintenance that does not directly change product behavior.

## Task Template

```md
### TASK-000: Short title

- Type: Project Setup
- Status: Todo
- Priority: P0
- Depends On: None
- Acceptance Criteria:
  - Concrete done condition.
- Implementation Notes:
  - Short technical guidance.
```
