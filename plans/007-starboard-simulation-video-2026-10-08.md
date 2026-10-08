# Starboard simulation video — 2026-10-08

## Verified cause and scope

`App.testDetail()` sent simulation effects to the global toast. It did not open a
dialog or include video. The Starboard API simulation itself is retained; the
UI now opens a native modal immediately, with a playable ten-second example.
Other configuration simulations use the same readable result dialog, without
pretending the Starboard video describes their features. Explicit social test
delivery endpoints are unchanged.

## Implementation

- Owned English/Portuguese WebM videos and PNG posters, generated from the
  committed canvas storyboard in `tools/generate-starboard-demo.mjs`.
- User-initiated playback, native controls, no audio, written alternative,
  keyboard dismissal, focus restoration and responsive layout.
- Clearly separated sample video (three stars) and API validation of the actual
  unsaved draft. Disabled feature notice, issues, no-action result, technical
  details disclosure, retry and bounded twenty-second wait.
- Abort/discard on close or navigation, response feature-key validation, no
  configuration save or Discord delivery as part of this demonstration.

## Local verification

- TypeScript and Vite production build passed (existing font/chunk warnings).
- 24 unit tests passed.
- 20 browser scenarios passed, including existing server/resource recovery,
  video playback, finite duration, English/Portuguese, reduced-motion/no autoplay,
  failed API/retry, invalid draft, mismatched feature, media failure, close,
  navigation and timeout. The generic Levels & XP result dialog is also covered.
- Desktop and 375px mobile screenshots inspected; no horizontal dialog overflow.
- Public asset hashes, Helper session, auth handoff, CSP and diff checks passed.

These browser checks isolate all API requests with fixtures. They do not verify
the user's authenticated session or a real Discord Starboard publication.

## Release

Publish through the existing guarded GitHub Pages workflow and verify the served
build and both video assets, followed by the same isolated browser scenarios.
No VPS binary, Caddy, TTS, Premium assignment or customer data change is required.
Rollback is a source revert followed by the same Pages workflow; do not bypass
the workflow or overwrite an unrelated deployment.
