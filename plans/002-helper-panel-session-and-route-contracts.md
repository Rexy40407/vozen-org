# Plan 002: Make Helper panel loads cancellable and testable

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving on. If a
> STOP condition occurs, stop and report — do not improvise. When complete,
> update this plan's row in `plans/README.md`.
>
> **Drift check (run first)**:
>
> ```powershell
> git diff --stat e79571e..HEAD -- apps/helper-panel/package.json apps/helper-panel/package-lock.json apps/helper-panel/src/App.tsx apps/helper-panel/src/api.ts apps/helper-panel/src
> ```
>
> If the cited effects or API shape have changed, compare live code with the
> Current state before proceeding. A material mismatch is a STOP condition.

## Status

- **Priority**: P1
- **Effort**: M
- **Risk**: MED
- **Depends on**: `plans/001-single-authoritative-site-pipeline.md`
- **Category**: bug / tests / perf
- **Planned at**: commit `e79571e`, 2026-08-19
- **Implementation**: complete; cancellation/session-route tests and the panel
  production build pass.

## Why this matters

The Helper panel opens several independent API requests while users can change
route, server, or session. Some effects do not cancel old requests, so an old
response can update the current screen after a route/guild change. That is a
credible source of long loading, a transient wrong screen, and account/panel
redirect confusion. There is no behavioural test runner in the panel package,
so these lifecycle regressions can ship unnoticed.

## Current state

- `apps/helper-panel/package.json:6-25` has only `build`, `dev`, `preview`,
  and a static `ui:check`; there are no test/spec/Vitest/Playwright/Jest files.

  ```json
  "scripts": {
    "build": "tsc -b && vite build",
    "dev": "vite",
    "preview": "vite preview",
    "ui:check": "node scripts/verify-ui.mjs"
  }
  ```

- `apps/helper-panel/src/api.ts:498-522` already accepts a `RequestInit`, so
  it can carry `AbortSignal`, but public `api` methods such as `guilds`,
  `quickSetup`, `guildContext`, and `feature` do not expose it.

  ```ts
  async function request<T>(path: string, init?: RequestInit): Promise<T> {
    const response = await fetch(apiUrl(path), {
      ...init,
      cache: init?.cache ?? 'no-store',
      credentials: 'include',
      headers: { Accept: 'application/json', ...(init?.headers ?? {}) },
    });
  }
  ```

- `apps/helper-panel/src/App.tsx:2157-2221` correctly owns a `cancelled`
  boolean for initial hydration, but only after the first `meOrBootstrap()` and
  `guilds()` calls begin. `App.tsx:2223-2285` starts Quick Setup, guild-context,
  and five feature requests without cleanup. `App.tsx:2321-2387` starts a
  feature-detail request with no cancellation and depends on `features`, which
  it also updates.

  ```ts
  // App.tsx:2257-2284
  void api.quickSetup().then(setQuickSetup).catch(...);
  void api.guildContext().then(setGuildContext).catch(...);
  void Promise.all([...].map(async ([name, key]) => api.feature(key)))
    .then((entries) => setQuickSetupDefaults(Object.fromEntries(entries)));
  ```

- The established UI convention is hash routing (`parseRoute`, `navigate`, and
  `hashchange` at `App.tsx:2139-2149`) and a first-party session bootstrap
  (`bootstrapVozenAccountSession` at `api.ts:463-496`). Preserve those
  contracts; do not add another authentication model.

## Commands you will need

| Purpose | Command | Expected on success |
|---|---|---|
| Install panel deps | `npm ci --prefix apps/helper-panel` | exit 0 |
| Existing UI guard | `npm run ui:check --prefix apps/helper-panel` | exit 0 |
| Type/build | `npm run build --prefix apps/helper-panel` | exit 0 |
| New unit/integration tests | `npm test --prefix apps/helper-panel` | all tests pass |
| Canonical release checks | `npm ci; npm run docs:build; npm run docs:test; npm run docs:links; npm run docs:a11y; npm run site:check` | exit 0 |

## Scope

**In scope**:

- `apps/helper-panel/package.json`
- `apps/helper-panel/package-lock.json`
- `apps/helper-panel/vite.config.*` only if needed to configure the chosen test
  environment
- `apps/helper-panel/src/api.ts`
- `apps/helper-panel/src/App.tsx`
- New test/setup files below `apps/helper-panel/src/`

**Out of scope**:

- Changing Helper Rust API response shapes or OAuth provider configuration.
- Visual redesign, translation copy rewrites, or local-preview feature changes.
- Replacing hash routing with another router.

## Git workflow

- Branch: `advisor/002-helper-panel-route-contracts`.
- Use focused conventional commits, for example
  `fix(helper-panel): cancel stale route loads` and
  `test(helper-panel): cover session and route transitions`.
- Do not deploy until the full canonical site workflow passes.

## Steps

### Step 1: Add a deterministic panel test harness

Add a maintained React/Vite-compatible test runner and DOM environment to the
panel package (Vitest plus a DOM/testing-library stack is appropriate if it is
compatible with the pinned React 19/Vite 8 versions). Add `npm test` without
weakening `ui:check` or the existing build. Commit the resulting lockfile.

Create a small API mock boundary around `api` so route tests can control
resolution order without contacting production. Match the existing explicit
`localPreviewMode`/`api` boundary; do not use a live Discord token or a real
network request in unit tests.

**Verify**: `npm ci --prefix apps/helper-panel; npm test --prefix apps/helper-panel`
→ exit 0 with one intentional smoke test.

### Step 2: Thread cancellation through read-only API calls

Expose an optional `RequestInit` or `AbortSignal` parameter on the read-only
`api` functions used by `App.tsx` (at minimum `me`, `meOrBootstrap`, `guilds`,
`quickSetup`, `guildContext`, `feature`, `features`, and the dashboard reads).
Pass it to the existing `request` function rather than creating a second fetch
implementation. Keep mutation methods and their error contracts unchanged.

Update `meOrBootstrap` carefully: an aborted request must propagate as an
abort, not trigger a second OAuth bootstrap or turn into an account-expired
message.

**Verify**: `npm run build --prefix apps/helper-panel` → exit 0; add a test
that asserts an aborted read does not invoke bootstrap or emit an error banner.

### Step 3: Prevent stale effects from committing UI state

For the effects at `App.tsx:2223-2285`, `2321-2387`, and the subscription
loads immediately below them, create an `AbortController` per effect run and
return cleanup that aborts it. Before each `setState` after an awaited request,
check the request is still current. Treat `AbortError` as expected cleanup:
do not set the panel to `error`, clear a saved form, or show a failure message.

Use a stable request identity for the selected guild and feature key. Do not
depend on the whole `features` or `guilds` array if a scalar guild ID/key is
sufficient; otherwise document why the dependency is required.

**Verify**: `npm test --prefix apps/helper-panel` → tests cover changing guild,
changing feature detail, and unmounting before a deferred response resolves;
none of those tests observes stale state or an error message.

### Step 4: Cover session and hash-route regressions

Add focused tests for these public behaviours:

1. a valid first-party session reaches the server picker without waiting for
   secondary dashboard reads;
2. a 401 that successfully bootstraps once retries `/api/me` once and reaches
   ready state;
3. a failed/aborted bootstrap does not navigate to account by itself or loop;
4. `#/servers` does not hydrate dashboard-only resources;
5. a late response for an old guild/feature cannot overwrite the current one.

Keep tests at component/API-boundary level. Browser end-to-end tests are not
needed unless the new harness cannot observe the hash lifecycle.

**Verify**: `npm test --prefix apps/helper-panel; npm run ui:check --prefix
apps/helper-panel; npm run build --prefix apps/helper-panel` → all exit 0.

## Test plan

- Mock deferred API promises and resolve them out of order after route/guild
  changes.
- Verify `AbortSignal.aborted` on effect cleanup and no stale `setState` result.
- Cover happy first-party session bootstrap and failed bootstrap once each.
- Retain the current static `ui:check` and full canonical site checks.

## Done criteria

- [ ] The panel has a committed, deterministic `npm test` command.
- [ ] Every read launched by the cited effects is abortable or guarded by an
  equivalent current-request check.
- [ ] Aborted requests never show a spurious error or alter the current route.
- [ ] Tests cover session bootstrap, `#/servers`, guild switch, feature switch,
  and unmount/late-response behaviour.
- [ ] `ui:check`, build, panel tests, and canonical site checks exit 0.
- [ ] No files outside the in-scope list changed.

## STOP conditions

- The API cannot accept an abort signal without changing server semantics.
- A test requires a real Discord credential, live API, or production browser
  storage to reproduce the flow.
- The route-to-account transition is triggered by an external account page,
  rather than the panel code in scope.
- A required dependency is incompatible with React 19/Vite 8/Node 22.

## Maintenance notes

- New panel data-loading effects must use the same cancellation/current-request
  pattern and add a deferred-response test.
- Reviewers should reject calls to `fetch` in `App.tsx` that bypass `api.ts`.
- Backend session-hardening work is tracked separately in the Helper
  repository; keep client tests independent from server internals.
