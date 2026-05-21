# Polaris UI Patterns

Polaris uses a minimalist Apple-inspired interface for the cross-platform trade journal.

## Design Direction

- Premium, modern, quiet, and minimal.
- Mobile-first layouts that expand into a left-sidebar desktop shell.
- Lots of whitespace, restrained hierarchy, and dense information only where useful.
- Soft card surfaces using subtle borders and shadows.
- Light and dark mode must use shared theme tokens instead of hard-coded screen colors.
- Inspiration: Apple Health, Linear, and Notion.

## Color Tokens

| Purpose | Value |
| --- | --- |
| Accent | `#007AFF` |
| Profit | `#30D158` |
| Loss | `#FF453A` |
| Light background | `#F7F7F5` |
| Dark background | `#0B0B0C` |

Theme implementation lives in `lib/ui/theme.ts`.

## Reusable Components

Use `lib/ui` before adding screen-local styling:

- `AppShell`: page layout, desktop sidebar, responsive content container.
- `Card`: standard bordered surface.
- `PrimaryButton`, `PrimaryLinkButton`, `SecondaryLinkButton`: app actions.
- `SectionHeading`: page title pattern.
- `TextField`: labeled form input with dark-mode support.
- `LoadingState`, `EmptyState`: standard states.
- `FadeInView`: subtle entrance animation for page content.

## Screen Patterns

### Dashboard

- Sidebar navigation on desktop.
- Summary metric cards first: total P&L, win rate, profit factor, trade count.
- Equity curve in the primary content area.
- Recent trades panel beside or below the chart depending on available width.

### Add Trade

- Form uses grouped cards instead of a long bare page.
- Inputs wrap into two columns on larger screens and one column on mobile.
- P&L preview sits beside the form on desktop and below it on mobile.
- Direction uses a segmented control.

### Trade Detail

- Hero row shows symbol, direction, status, and net P&L.
- Metrics use compact repeated tiles.
- Tags, notes, and screenshots are separate card sections.
- Screenshot previews use signed URLs and stay inside bordered frames.
