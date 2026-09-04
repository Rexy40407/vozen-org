# Integrated growth release evidence

Last verified: 2026-09-04. This is an evidence ledger, not a substitute for the private analytics panel. It contains no guild or user identifiers and no provider credentials.

## Released revisions

| Surface | Revision | CI / release evidence |
| --- | --- | --- |
| Public site (`vozen-org`) | `a2054a2ff7ab8be44abf7a05a518876f2d46cfb6` | GitHub Actions `33826384680`, successful; secure TTS return route, legacy add-server redirect, product CSS, and layout stability confirmed on production |
| Private panel (`painel`) | `0adbc8bd2a48ea200406b56fdc882ce9b6b0e7fd` | GitHub Pages `33819539062`, successful; funnel, product filter, votes, daily series, and range-consistent cards confirmed on production |
| TTS runtime (`Vozen_TTS`) | `80d012bd7a4657a2609f455fc1347a924e96b50c` | CI `33820879350` and deploy `33822180768`, successful; exact revision label and healthy image active in the production container |
| Helper runtime (`vozen-helper`) | `c36d10f22613df1b4c102b9e5c0c41b31fd2b099` | CI `33822228280` and release `33822228299`, successful; exact checksum-verified release active in the production service |

## Automated verification

- TTS: the final CI passes 781 workspace tests plus 195 voice-driver tests in both development and release profiles, with no failures or ignored tests.
- Helper: `cargo test --workspace --all-targets` passes 226 tests with no failures or ignored tests; strict workspace Clippy and both Rust and npm dependency audits pass.
- Private panel: 53 unit/contract tests and 8 Playwright tests pass.
- Public site:
  - metadata passes for 164 public pages;
  - resources and internal links pass for 178 pages;
  - accessibility smoke checks pass for 83 documentation pages;
  - 26 Playwright journeys pass across 320, 375, 768, 1024, and 1440 px, including the secure TTS result states and the three Portuguese editorial guides;
  - generated localization is current for 10 locales and the Home, TTS, and Helper entry routes;
  - localized-page generator coverage is 95.78% lines, 89.77% branches, and 100% functions;
  - initial marketing JavaScript is 52,042 bytes gzip on Home, 52,939 on TTS, and 59,364 on Helper;
  - all 29 shipped raster images remain under 200 KB; large Helper and Stripe artwork ships with WebP primaries and optimized PNG fallbacks, while Helper picker thumbnails load lazily;
  - Lighthouse: Home 100/100/100/100 with 1,652 ms LCP, 0 ms TBT, and 0.002 CLS; TTS 100/97/100/100 with 1,755 ms LCP, 33 ms TBT, and 0 CLS; Helper 100/97/100/100 with 1,802 ms LCP, 0 ms TBT, and 0.003 CLS.

## Production evidence

The read-only production audit returned database integrity `ok` for both products.

### TTS lifecycle and Top.gg

- 186 current guilds, 201 lifecycle rows, 92 currently configured guilds, and 95 current guilds with recorded use.
- Measurement starts on 2026-08-28. At this audit, all non-baseline measured transitions still fall inside the current seven-day window, so the 7-, 30-, and 90-day event totals correctly match; the requested range and coverage date remain visibly distinct in the panel.
- Measured acquisition: 36 joins, 18 leaves, 14 new setup completions, and 2 new first-value events after excluding the 168-guild baseline inventory.
- Current readiness and use come from live `guild_config` and `talk_stats` state, while period funnel events count only transitions observed after instrumentation began. This is why 92 currently ready and 95 historically used guilds do not equal the 14 new setups or 2 new first values.
- Top.gg last delivery returned HTTP 204 for 186 guilds at 2026-09-04 00:41 UTC, with zero consecutive failures and a sanitized `delivered` state.
- The public Top.gg listing independently displayed the same 186-server count after that delivery, proving production convergence within the required one-hour window.
- The retention migration stores anonymous W7/W30 outcomes durably while retaining guild-scoped deduplication only until the ordinary 30-day departure purge. Tests prove rates survive identity purge and migration replay does not double count; production database integrity is `ok`.
- The reward tests prove authenticated delivery, idempotency per provider event, a 24-hour grant, four rewards per rolling 30 days, a maximum 48-hour future expiry, and 30-day removal of raw and pseudonymous ledger rows.

### Helper lifecycle

- 4 current guilds, 2 first-value guilds, 2 active guilds, and no completed module configuration yet. Measurement starts on 2026-08-29.
- Setup is recorded only after a successful `/setup` or the first valid module configuration; no setup is fabricated from installation.
- The lifecycle tests prove one-time setup/first-value events, daily activity, re-entry handling, durable anonymous W7/W30 outcomes, migration idempotency, and removal of departed guild identities after 30 days.
- The private Helper growth route rejects a mismatched `product=tts` request and returns the same aggregate-only contract as TTS without guild or user IDs.
- Helper applies the same sanitized Top.gg health contract. Its state is `unconfigured` because no Helper Top.gg project/token is configured yet; this is not reported as a successful sync.

### Web analytics and cache

- Cloudflare account, zone, site tag, and read-only token are present only on the server.
- Both RUM datasets are enabled and their GraphQL requests return HTTP 200.
- The authenticated proxy returns real traffic, page, referrer, device, and Web Vitals aggregates for 7, 30, and 90 days.
- At the audit time it returned 71 visits / 98 page views for 7 days, 110 / 140 for 30 days, and 120 / 150 for 90 days.
- Browser verification confirms the cookie-free beacon on public marketing/documentation/legal pages and no beacon on account or dashboard pages.
- Cloudflare Cache Response Rule `Cache imutável para assets versionados` gives versioned assets `max-age=31536000, s-maxage=31536000, immutable, public`; a repeated production request returned `cf-cache-status: HIT`.
- Production serves the optimized Helper rank artwork as `image/webp` with an optimized PNG fallback; both returned HTTP 200 and `cf-cache-status: HIT`, and the published bundle contains WebP selection plus lazy thumbnail loading.
- The 2026-09-04 layout-stability release removed the CSS loader that waited for the first pointer, keyboard, wheel, touch, or scroll event. TTS and Helper now load one generated product stylesheet atomically; Home activates its non-critical stylesheet at `load`, before visitor interaction.
- Production returns HTTP 200 for both product stylesheets, the HTML references those exact assets, the retired interaction loader returns HTTP 404, and a repeated product CSS request returns `cf-cache-status: HIT` with `max-age=31536000, s-maxage=31536000, immutable`.
- Cloudflare's rolling RUM windows still contain samples collected before this release. Synthetic and production-asset checks prove the code-level fix, but the field CLS acceptance gate remains open until enough post-release RUM samples are observed; historical samples are not relabelled as fixed.

### Public release

- Production serves the real review proof on both `/tts/` and `/pt/tts/`, linking to the moderated Top.gg record without copying reviewer identities, avatars, or quotations.
- `robots.txt`, `llms.txt`, `sitemap.xml`, the custom 404, favicon, bilingual English/Portuguese guides, TTS documentation, Portuguese TTS page, and Helper page all return successfully.
- The release sitemap contains 164 canonical URLs. Ordinary indexing is allowed while named AI-training crawlers remain blocked.
- Secure TTS and Helper OAuth entry points use signed state, server-side callbacks, PKCE where applicable, replay protection, and limited permissions without `Administrator`.
- The TTS callback now lands on the deployed `/dashboard/` result surface. Production browser checks prove the installed and cancelled states, the three-step server → `/setup` → first-audio guide, and the working retry path. The legacy `/dashboard.html?add=1` route immediately reaches Discord through the server-side start endpoint; it no longer waits for a dashboard session or constructs OAuth state in the browser.
- The final TTS deploy used the exact CI-built immutable image, verified its checksum, created and verified an online SQLite backup, and passed rollback-aware production health checks. A storage preflight failure was resolved by removing only inactive, reinstallable editor caches; databases, models, rollback data, and the live container were preserved.
- The final Helper deploy verified the GitHub release digest `sha256:3a7dd40b41f0e177537e19de9fdd9a91c255890d89292336e9b6a47efce95e7d`, created a restorable SQLite backup with integrity `ok`, switched the release symlink atomically, and confirmed API and gateway readiness on the exact release.

## External gates still requiring an account action

These items must remain open until their external state is observed after submission:

1. Re-submit `https://vozen.org/sitemap.xml` in Google Search Console. The verified domain currently shows the previous 135-page read from 2026-09-01, while the release sitemap now has 164 URLs.
2. Log in to the Discord Developer Portal and inspect App Verification and Discovery Status for both application IDs. Discord requires a verified app before Discovery can be enabled.
3. Complete the real Discord App Directory fields from `004-bot-directory-listing-pack.md`, preview them, and enable Discovery only when the portal checklist is green.
4. Submit the eligible bot(s) to `discord.bots.gg` and `discordbotlist.com` after reviewing each directory's current terms. Both sites require a Discord account login; no listing was found during the audit.
5. Recheck Search Console and each directory after their review/indexing delays. Submission alone is not proof of acceptance or indexing.
