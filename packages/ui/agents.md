# Agents Playbook

## Context & Working Agreement

This repository hosts the Aztec OTC Desk front-end, built with Vite and TypeScript to deliver a clean, reusable, and well-structured UI for an OTC trading workflow. The high-level product goals, navigation, wallet behavior, and page content requirements are summarized below. **Every time work progresses, read this section first and update the checklist to reflect the current state so future iterations (AI or human) stay aligned.**

## Build Checklist

### Project Setup

- [x] Initialize Vite + React + TypeScript project scaffold
- [x] Establish global styling strategy (e.g., design tokens, typography, spacing scale)
- [x] Add basic linting/formatting config (ESLint + Prettier) aligned with TypeScript
- [x] Document Bun scripts in this README once created

### Core Architecture

- [x] Define folder structure for components, views, contexts, hooks, and assets
- [x] Implement routing (landing `/`, `"/mint"`, `"/sell"`, `"/buy"`, plus additional views as needed)
- [x] Create shared layout wrapping NavBar, footer, and content outlet
- [x] Decide on state management approach (React context + hooks) and scaffold base providers

### NavBar

- [x] Build NavBar shell with three logical areas: navigation, wallet status, app icon
- [x] Implement navigation buttons with active state styling and routing integration
- [x] Create scalable SVG square icon component positioned right-most with landing-page click behavior

### Wallet Interaction

- [x] Design wallet status component with red/green state indicator and styled container
- [x] Implement wallet context tracking provider, accounts, connection state, and actions
- [x] Build connection modal (not connected): provider list with icons, disabled styling for unavailable options, hook up selection handler
- [x] Build connected modal view: show full address, dropdown of available accounts, disconnect button, state-driven modal transitions
- [x] Wire modal to open from wallet box clicks and respond to external state changes

### Footer

- [x] Implement minimal footer with "Created by Aztec Pioneers" copy
- [x] Add GitHub and Discord icons linking to placeholder (Google) URLs that open in new tabs

### Views

- [x] Landing page: hero text for "Aztec OTC Desk" and supporting copy emphasizing privacy
- [x] Landing page: four feature cards (Private matching, Private execution, Private counterparties, Instant finality)
- [x] Landing page: placeholder "How to use" section with temporary content
- [x] Mint view: interactive mint workflow with balance display, token picker, and toast notifications
- [x] Sell (Open Orders) view component structure and placeholder content
- [x] Buy (Order Matching) view component structure and placeholder content

### Reusable Components & Hooks

- [x] Build feature card component for landing page reuse
- [x] Build modal primitive consistent with design system
- [x] Build button primitive consistent with design system
- [x] Build dropdown primitive consistent with design system
- [x] Implement wallet provider logo components (SVG)
- [x] Create hooks for modal visibility, wallet connection requests, and account selection

### Styling & UX Polish

- [x] Ensure responsive layout for desktop-first with graceful tablet/mobile behavior
- [x] Add hover/focus states, keyboard navigation, and basic accessibility labels
- [x] Validate color contrast and typography hierarchy

- [x] Update README with project setup instructions once tooling is in place

## Mint View Build Checklist

- [x] Define token metadata constant with five hardcoded assets (name, symbol, decimals) and placeholder icons reusable across views.
- [x] Implement reusable `TokenSelector` shell that displays selected token icon + symbol and clears to show custom dropdown on click.
- [x] Default selector to ETH and preserve previous selection when dropdown dismissed without choosing a new token.
- [x] Build styled dropdown list that filters tokens by case-insensitive symbol search as user types; show "No tokens found" when filtered list is empty.
- [x] Render token icon + symbol in both collapsed and dropdown states with cohesive design tokens.
- [x] Support click selection to close dropdown, update selection, and expose selection change to parent; clicking outside restores prior selection.
- [x] Create balance hook/context that fetches async balances with loading and error states per token.
- [x] Display "Balance:" row showing spinner while fetching, and render formatted amount once resolved.
- [x] Include refresh text-button to re-trigger balance fetch when idle; hide while request is pending.
- [x] Add integer-only mint input (no decimals/non-numeric) capped at 999,999,999; hide entire mint form while balance is pending.
- [x] Provide mint button that triggers async mint hook; optimistically update balance on success without refetching.
- [x] Replace mint form with loading spinner + "minting..." text while mint is pending.
- [x] Reset form state on mint completion/failure; ensure failure re-enables input/button.
- [x] Emit toast notifications bottom-left for mint success (green) and failure (red) with relevant message payloads.
- [x] Ensure dropdown, spinner, and toast components are reusable primitives for other flows.
- [x] Cover accessibility basics: focus management, keyboard navigation in dropdown, ARIA roles for status/toasts.

## Sell View Build Checklist

- [x] Scaffold sell view route + component shell mirroring mint page layout with central card container.
- [x] Wire reusable `TokenSelector` instances for sell/buy legs with mutually-exclusive token enforcement and ETH/USDC defaults.
- [x] Implement shared integer-only amount inputs with validation (`0`, `>999,999,999`, non-numeric) and per-field error messaging.
- [x] Compose stacked action module (sell selector, sell amount, buy selector, buy amount, confirm button) with responsive spacing.
- [x] Create sale workflow hook handling mocked escrow creation & deposit calls, progress state machine, and reset logic.
- [x] Render progress bar (0 → 100%) reacting to hook phases (pre-sign, signed, confirmed for each tx) and reset after success/failure.
- [x] Integrate toast notifications for sale success/failure summarising token pair + amount.
- [x] Ensure UI gracefully reverts to idle state on any failure while preserving prior input selections.
- [x] Add loading/disabled states to prevent duplicate submissions during in-flight operations.

## Sell View Mock References

- `src/hooks/useSellOrder.ts`: mocks escrow creation and deposit wallet interactions with staged delays, toast integration, and auto-reset after success/failure.

## Buy View Build Checklist

- [x] Scaffold buy view shell replicating card layout with vertically stacked sell/buy selectors and dual amount rows.
- [x] Reuse `TokenSelector` for sell/buy legs with mutual exclusion and USDC/ETH defaults.
- [x] Implement paired min/max amount inputs per leg with shared validation (non-numeric, zero, >999,999,999) and inline messaging.
- [x] Ensure min ≤ max for both legs, surfacing user guidance when invalid.
- [x] Compose confirm action button with disabled states reflecting validation + workflow progress.
- [x] Build buy workflow hook mocking single-transaction flow (sign → submit) with progress milestones and reset mechanics.
- [x] Render progress bar with 0/50/100% states tied to signature + confirmation outcomes.
- [x] Trigger success/error toasts summarising order parameters; on failure, restore prior inputs and stop progress bar.
- [x] Prevent duplicate submissions while workflow is active and re-enable immediately after completion/reset.

## Buy View Mock References

- `src/hooks/useBuyOrder.ts`: mocks signature + confirmation stages for buy orders with deterministic delays, progress integration, and toast messaging.

## Wallet Integration Checklist

- [x] Install Aztec SDK dependencies (version `3.0.0-nightly.20250923`) required by embedded/extension wallets and supporting utilities.
- [x] Port wallet utility modules (`conversion`, `web_logger`, shared styles) or replace their functionality for the OTC UI context.
- [x] Implement IndexedDB-backed `WalletDB` using `@aztec/kv-store` and ensure initialization during app bootstrap.
- [x] Integrate `EmbeddedWallet` class for Aztec native wallet flows (PXE service bootstrap, account management, sender registry).
- [x] Include `ExtensionWallet` adapter to support future browser-extension integrations.
- [x] Expose wallet state via React context/hooks (accounts, selected account, connect/disconnect) leveraging the ported wallet logic.
- [x] Incorporate account creation flow inside the wallet modal when the embedded/native wallet is selected; skip address book/add-sender components for now.
- [x] Replace placeholder wallet status UI with real connection state, account list, and modal flows powered by the new context.
- [x] Ensure async flows (PXE startup, account creation, mint) surface errors through toasts and maintain loading affordances.
- [x] Document wallet usage (environment assumptions, required services) in the README for future iterations.

## Token Context Merge Checklist

- [x] Audit existing providers and hooks (`TokenBalanceProvider`, `useTokenBalance`, `TokenProvider`, `useTokenContracts`, `useTokenLifecycle`) to map every import site before making changes.
- [x] Define the merged token state contract: statuses, token metadata map keyed by `TOKENS`, balance cache entry shape (`{ amount: number | undefined; status: 'idle' | 'loading' | 'success' | 'error'; error?: string }`).
- [x] Create a new combined context (e.g., `TokenContext`) that encapsulates token metadata, balance cache, refresh helpers, and any wallet-registration hooks now that PXE integration lives in `WalletContext`.
- [x] Replace the existing token initialization logic with a simple balance-fetch workflow; ensure any prior lifecycle hooks (`useTokenLifecycle`) are deleted or updated to no longer bootstrap contracts.
- [x] Implement a mocked balance fetch service that always resolves to `1`, wrapping it in a promise to simulate async behavior and centralise retry/refresh logic.
- [x] Add context methods for `getBalance(symbol)`, `refreshBalance(symbol)`, and `setLocalBalance(symbol, updater)` which update the cache and manage status transitions.
- [x] Ensure the context initialises cache entries for every token in `data/tokens.ts`, setting amount to `undefined` and status to `idle`.
- [x] Build/replace hook(s): primary hook to access the merged context (`useTokenBalance`) and ensure it returns `{ amount, status, error, refresh, setLocalBalance }`, triggering fetch whenever cache amount is `undefined`.
- [x] Remove legacy hooks (`useTokenBalance`, `useTokenContracts`, `useTokenLifecycle`) and update all import sites (`MintView`, `SellView`, `BuyView`, others) to use the new hook API.
- [x] Update `MintView` component so selecting a token drives the new hook: request fetch when cache amount is `undefined`, reactively display balance when it becomes defined, and wire refresh button to context refresh method.
- [x] Ensure manual balance refresh in the UI invalidates/sets cache status to loading and re-triggers the mocked query.
- [x] Update optimistic balance adjustments in mint flow to use the new `setLocalBalance` helper and keep cache consistent.
- [x] Simplify provider tree in `main.tsx` by removing `TokenBalanceProvider` and ensuring the merged provider exposes everything required for child components.
- [x] Delete redundant service files (`fakeBalances.ts`, previous token context files) once replacements exist, and adjust imports accordingly.
- [x] Run `bun run tsc --noEmit` (and any fast lint command if necessary) to confirm type safety after refactor.
- [ ] Manually retest the mint flow (balance display, refresh button, optimistic update) to confirm expected behaviour with mocked balances.
- [x] Update documentation (agents checklist and optionally README) to reflect the merged token context architecture and new hooks.

## Wallet Session Persistence Notes

- Capture user intent to reconnect (e.g., "remember me" flag) alongside the last-used provider (`'embedded' | 'extension'`) and the active account address; store these lightweight values in `localStorage`.
- On bootstrap inside `WalletProvider`, read the stored metadata before rendering children; if the flag is set, call `connect(provider)` immediately and, after `refreshAccounts()` resolves, restore the previously active account if it still exists.
- Clear the persistence flag and stored metadata whenever the user explicitly disconnects, so refreshing after a manual disconnect does not auto-login.
- Keep in mind extension wallets may still require user interaction; surface a prompt if auto-connect is not permitted.
- Do not persist sensitive material—the embedded wallet already stores keys in IndexedDB via `WalletDB`, so the reconnect flow only needs those metadata hints.

## WASM Load Optimisation Ideas

- The Aztec Noir runtimes ship large WASM binaries; when Vite pre-bundles them it rewrites URLs under `node_modules/.vite/deps`, which breaks `WebAssembly.instantiate`. We now exclude `@aztec/noir-noirc_abi` and `@aztec/noir-acvm_js` from `optimizeDeps` so the original `@fs/...` URLs are served.
- For faster interactive flows, proactively download those WASM assets during bootstrap: import the `.wasm` files once at startup or trigger a fetch/prefetch so the browser caches them (they will still load through the SDK later, but the response comes from cache).
- In production builds, replace `@fs` URLs with the emitted asset URLs (using Vite’s import return value) if you set up explicit preload links.
