# Helper account access — 2026-10-07

## Confirmed current failure

The account Helper link opens `/panel/helper-tracker/#/servers`, which requests
`https://api.vozen.org/rust/api/me`. The public request fails: the endpoint and
`/rust/health` return 404 without Helper CORS headers. The local Helper at port
8788 returns health 200, unauthenticated me 401, and the session-exchange OPTIONS
request returns 200 with the expected origin and credentials headers.

Read-only inspection of the active shared Caddy config shows `api.vozen.org`
falling through to TTS, without a public Helper `/rust/*` route. Correcting this
shared route is awaiting separately scoped user authorization. No proxy, VPS
service, subscription or entitlement data was changed during this investigation.

The authenticated account-loading error in the user's second screenshot has not
been independently reproduced with that user's session. The unauthenticated
Premium API returns 401 with the expected CORS origin. The screenshot alone does
not establish deletion of account/subscription data.

## Frontend change prepared locally

The existing handler navigated even after a failed session exchange. Its actual
source, executed in a VM fixture, produced three navigations for three clicks.
The handler now serializes navigation, reports exchange failures in an accessible
status message, keeps the user on the current page, and ignores an exchange if
the account token changed while it was pending.

## Verification

- `tools/auth-session-check.mjs` passes existing contracts and now executes the
  behavioral regression in `tools/helper-handoff-regression.mjs`.
- Behavioral checks cover repeated clicks, failed exchange and logout during an
  exchange. The original source failed the repeated-click assertion with 3 vs 1.
- Helper session, panel route, product installation contracts and syntax passed.
- Real-browser CLI verification used local preview port 4187 and intercepted fake
  account/API responses, not real OAuth tokens. A double-click with HTTP 503 from
  the exchange retained the account/profile and displayed the accessible error.
- Browser screenshot: `output/playwright/helper-access-failure-preserves-account.png`
  in the parent task directory; synthetic identity only.
- Generated HTML changes are asset cache hashes only; no TTS content or runtime
  changes. Public assets need publication through the existing Pages checks.

This is not a completed public fix: shared proxy authorization, publication and
authenticated user-visible verification remain outstanding.
