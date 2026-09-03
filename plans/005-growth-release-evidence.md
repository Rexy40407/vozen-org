# Integrated growth release evidence

Last verified: 2026-09-03. This is an evidence ledger, not a substitute for the private analytics panel. It contains no guild or user identifiers and no provider credentials.

## Released revisions

| Surface | Revision | CI / release evidence |
| --- | --- | --- |
| Public site (`vozen-org`) | `3a19d208fca6bd9390e43fc61ccbf6a75711e5f2` | GitHub Actions `33810751193`, successful; WebP primaries and optimized PNG fallbacks confirmed on production |
| Private panel (`painel`) | `981edb8f3f259e1af9be6d48746bb7959dd9a79b` | GitHub Actions `33788606428`, successful |
| TTS runtime (`Vozen_TTS`) | `ed64889ed10b6a6a7338d85d8a1fbd84412d269d` | GitHub Actions `33788606726`, successful; exact revision active in the production container |
| Helper runtime (`vozen-helper`) | `5a562b6c6ec091c6f33b7f1b7b345d7bb7d06e2b` | CI `33788827395` and release `33788827312`, successful; exact release active in the production service |

## Automated verification

- TTS: `cargo test --workspace --locked` passes 774 tests with no failures or ignored tests.
- Helper: `cargo test --workspace --all-targets` passes 222 tests with no failures or ignored tests.
- Private panel: 53 unit/contract tests and 8 Playwright tests pass.
- Public site:
  - metadata passes for 161 public pages;
  - resources and internal links pass for 174 pages;
  - accessibility smoke checks pass for 83 documentation pages;
  - 23 Playwright journeys pass across 320, 375, 768, 1024, and 1440 px;
  - generated localization is current for 10 locales and the Home, TTS, and Helper entry routes;
  - localized-page generator coverage is 95.78% lines, 89.77% branches, and 100% functions;
  - initial marketing JavaScript is 52,152 bytes gzip on Home, 53,503 on TTS, and 59,928 on Helper;
  - all 29 shipped raster images remain under 200 KB; large Helper and Stripe artwork ships with WebP primaries and optimized PNG fallbacks, while Helper picker thumbnails load lazily;
  - Lighthouse: Home 100/100/100/100 with 1,653 ms LCP and 0 CLS; TTS 100/100/100/100 with 1,880 ms LCP and 0 CLS; Helper 99/100/100/100 with 1,957 ms LCP and 0.003 CLS.

## Production evidence

The read-only production audit returned database integrity `ok` for both products.

### TTS lifecycle and Top.gg

- 184 current guilds, 199 lifecycle rows, 90 currently configured guilds, and 95 current guilds with recorded use.
- Measurement starts on 2026-08-28. The 7-, 30-, and 90-day growth requests therefore correctly contain the same complete measured history until more than seven days exist.
- Measured acquisition: 34 joins, 18 leaves, 12 new setup completions, and 2 new first-value events after excluding the baseline inventory.
- Historical aggregate rows contain 14 setup completions and 26 first-value guilds. These totals are intentionally distinct from the period funnel and the current configured/used snapshots.
- Top.gg last delivery returned HTTP 204 for 184 guilds with zero consecutive failures and a sanitized `delivered` state.
- The public Top.gg listing reported 179 servers at the audit time, a 2.7% difference from the live count and below the 5% alert threshold.
- The reward tests prove authenticated delivery, idempotency per provider event, a 24-hour grant, four rewards per rolling 30 days, a maximum 48-hour future expiry, and 30-day removal of raw and pseudonymous ledger rows.

### Helper lifecycle

- 4 current guilds, 2 first-value guilds, and 2 active guilds.
- Setup is recorded only after a successful `/setup` or the first valid module configuration; no setup is fabricated from installation.
- The lifecycle tests prove one-time setup/first-value events, daily activity, re-entry handling, and removal of departed guild data after 30 days.
- Helper applies the same sanitized Top.gg health contract. Its state is `unconfigured` because no Helper Top.gg project/token is configured yet; this is not reported as a successful sync.

### Web analytics and cache

- Cloudflare account, zone, site tag, and read-only token are present only on the server.
- Both RUM datasets are enabled and their GraphQL requests return HTTP 200.
- The authenticated proxy returns real traffic, page, referrer, device, and Web Vitals aggregates for 7, 30, and 90 days.
- At the audit time it returned 71 visits / 98 page views for 7 days, 110 / 140 for 30 days, and 120 / 150 for 90 days.
- Browser verification confirms the cookie-free beacon on public marketing/documentation/legal pages and no beacon on account or dashboard pages.
- Cloudflare Cache Response Rule `Cache imutável para assets versionados` gives versioned assets `max-age=31536000, s-maxage=31536000, immutable, public`; a repeated production request returned `cf-cache-status: HIT`.
- Production serves the optimized Helper rank artwork as `image/webp` with an optimized PNG fallback; both returned HTTP 200 and `cf-cache-status: HIT`, and the published bundle contains WebP selection plus lazy thumbnail loading.

### Public release

- Production serves the real review proof on both `/tts/` and `/pt/tts/`, linking to the moderated Top.gg record without copying reviewer identities, avatars, or quotations.
- `robots.txt`, `llms.txt`, `sitemap.xml`, the custom 404, favicon, public guides, TTS documentation, Portuguese TTS page, and Helper page all return successfully.
- The live sitemap contains 161 canonical URLs. Ordinary indexing is allowed while named AI-training crawlers remain blocked.
- Secure TTS and Helper OAuth entry points use signed state, server-side callbacks, PKCE where applicable, replay protection, and limited permissions without `Administrator`.

## External gates still requiring an account action

These items must remain open until their external state is observed after submission:

1. Re-submit `https://vozen.org/sitemap.xml` in Google Search Console. The verified domain currently shows the previous 135-page read from 2026-09-01, while the live sitemap now has 161 URLs.
2. Log in to the Discord Developer Portal and inspect App Verification and Discovery Status for both application IDs. Discord requires a verified app before Discovery can be enabled.
3. Complete the real Discord App Directory fields from `004-bot-directory-listing-pack.md`, preview them, and enable Discovery only when the portal checklist is green.
4. Submit the eligible bot(s) to `discord.bots.gg` and `discordbotlist.com` after reviewing each directory's current terms. Both sites require a Discord account login; no listing was found during the audit.
5. Recheck Search Console and each directory after their review/indexing delays. Submission alone is not proof of acceptance or indexing.
