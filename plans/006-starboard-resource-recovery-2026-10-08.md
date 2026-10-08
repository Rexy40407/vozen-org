# Starboard: recover Discord resource selectors

User-reported screen: Starboard detail renders, but Default channel is disabled
and reports Discord resources unavailable. The actual authenticated request
behind that screenshot has not been inspected.

Confirmed client defect: guild-context errors were silently discarded; there
was no retry, deadline, response guild validation, or explicit loading/error
state. A prior guild's context could remain while loading a replacement.

## Change

- Separate session-gated resource loading from Quick Setup composition.
- Clear prior resources on reload and accept only the active guild's context.
- Bound requests to 20 seconds, cancel superseded requests, and expose a
  resource status card with Reload channels and roles.
- Retain unsaved feature settings during resource retries.
- Do not show Fully synced while resource loading/error/staleness is known.
- Distinguish a successfully loaded empty resource list from missing data.
- Add English and Portuguese copy; other locales use the existing English fallback.
- No Rust runtime, shared proxy, entitlement or customer-data changes.

## Verification

- Passed: panel TypeScript/Vite build and 24 Vitest tests in 8 files.
- Passed: existing session/account source contracts and generated HTML
  cache-hash-only diff check.
- Passed: 11 browser regression scenarios including failed, wrong-guild and
  stale resource recovery, plus selecting a channel and saving Starboard config.
- Passed: browser visual check of the error card and restored selector.
- Fixtures intercept APIs; no real Discord message or configuration was sent.

## Release and remaining QA

Publish with the existing Pages pipeline, then verify the served panel asset
and the same resource recovery tests against that published build. Keep the
previous commit as the static-site rollback point (9d41d6c).

Actual customer channel selection and a Discord reaction canary remain pending.
This change does not grant Premium or skip backend authorization/preflight.
