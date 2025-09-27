# OTC Trading Desk UI

Aztec's OTC Desk UI is a desktop-first React application built with Vite and TypeScript. It provides a private trading experience with real wallet integrations, mint and sell flows, and buy-side discovery tools backed by mocked service hooks while integration work is in-flight.

## Features

- Desktop-only experience with automatic mobile detection and friendly guidance on the landing page
- Wallet-aware navigation and connection modal supporting embedded and extension providers
- Mint, sell, and buy flows using reusable token selectors, validation-aware forms, and toast feedback
- Shared UI primitives (modals, dropdowns, spinners, feature cards) to keep styling cohesive across views

## Wallet & Environment

- Requires access to an Aztec PXE/Node endpoint (defaults to `http://localhost:8080`).
- Embedded wallet persists data using IndexedDB; run in a secure context (https/localhost).
- Connect the embedded wallet before visiting transactional routes; mobile devices are redirected to the landing page.

## Getting Started

1. Install [Bun](https://bun.sh/) (version 1.2.21 or later).
2. Install dependencies and launch the dev server:
   ```bash
   bun install
   bun run dev
   ```
   The app will be available at `http://localhost:5173`.

### Scripts

| Purpose                  | Command                |
| ------------------------ | ---------------------- |
| Install dependencies     | `bun install`          |
| Start dev server         | `bun run dev`          |
| Type-check & build       | `bun run build`        |
| Lint source              | `bun run lint`         |
| Format files             | `bun run format`       |
| Check formatting         | `bun run format:check` |
| Preview production build | `bun run preview`      |

## Additional Documentation

Detailed checklists, outstanding tasks, and agent-specific guidance now live in [`agents.md`](agents.md).
