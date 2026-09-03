# Plan 001: Make `vozen-org` the sole publisher of `vozen.org`

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving on. If a
> STOP condition occurs, stop and report — do not improvise. When complete,
> update this plan's row in `plans/README.md`.
>
> **Drift check (run first in each repository)**:
>
> ```powershell
> git -C ..\vozen-org-ui-fix diff --stat e79571e..HEAD -- .github/workflows/pages.yml site package.json package-lock.json apps/helper-panel
> git -C ..\Vozen_TTS-auth-fix diff --stat acd7ce9..HEAD -- .github/workflows/pages.yml site CNAME package.json package-lock.json README.md DEPLOY.md
> ```
>
> If either command reports changes in scope, compare the Current state with
> the live code before proceeding. A mismatch is a STOP condition.

## Status

- **Priority**: P1
- **Effort**: M
- **Risk**: HIGH
- **Depends on**: none
- **Category**: migration / dx / release
- **Planned at**: commits `e79571e` (`vozen-org-ui-fix`) and `acd7ce9`
  (`Vozen_TTS-auth-fix`), 2026-08-19
- **Implementation**: complete. On 2026-09-03, repository settings confirmed
  `Rexy40407/vozen-org` uses GitHub Actions, owns the `vozen.org` custom domain,
  has a successful DNS check, and enforces HTTPS. `Rexy40407/Vozen_TTS` has no
  custom domain and exposes only its default project URL. Production canaries
  for `/`, `/account/`, and `/panel/helper-tracker/` all returned HTTP 200.

## Why this matters

Two repositories can independently publish a web site configured for the same
public domain. The canonical site repository builds the current account and
Helper panel, while the TTS repository still builds an older `site/` tree.
That split ownership can overwrite a good release with stale files and makes a
successful deployment non-deterministic. After this plan, one repository owns
the public artifact and the other cannot silently reclaim the domain.

## Current state

- `../vozen-org-ui-fix/.github/workflows/pages.yml` is the current public
  site release workflow. It builds docs and `apps/helper-panel`, installs the
  panel into `site/`, then publishes the `site/` tree to `gh-pages`.

  ```yaml
  # vozen-org-ui-fix/.github/workflows/pages.yml:38-50
  - name: Build Helper documentation
    run: |
      npm ci
      npm run docs:build
      npm run docs:test
      npm run docs:links
      npm run docs:a11y
      npm run site:check
  - name: Build Helper panel
    run: |
      npm ci --prefix apps/helper-panel
      npm run build --prefix apps/helper-panel
      node tools/install-helper-panel.mjs
  ```

- `../Vozen_TTS-auth-fix/.github/workflows/pages.yml:1-60` separately deploys
  `site-dist` with `pages: write` and `id-token: write`; it triggers for every
  `site/**` push to `main` and calls `actions/configure-pages` with
  `enablement: true`.

  ```yaml
  # Vozen_TTS-auth-fix/.github/workflows/pages.yml:8-23
  on:
    push:
      branches: [main]
      paths: ['site/**', 'tools/minify-site.mjs', 'site-tests/**', ...]
  permissions:
    contents: read
    pages: write
    id-token: write
  ```

- The two static trees have drifted substantially: the TTS tree lacks current
  account/panel source and has different `account.html`, `dashboard.html`,
  `css/main-v43.css`, and `js/dashboard-v8.js` files. Treat the TTS tree as
  legacy content, not a second source of truth.
- The custom-domain transfer itself is GitHub configuration, not a file edit.
  It requires an owner to confirm in repository Pages settings which repository
  owns `vozen.org`. Do not put a domain token or a GitHub credential in source.

## Commands you will need

| Purpose | Command | Expected on success |
|---|---|---|
| Canonical site checks | `npm ci; npm run docs:build; npm run docs:test; npm run docs:links; npm run docs:a11y; npm run site:check` | exit 0 |
| Panel build | `npm ci --prefix apps/helper-panel; npm run build --prefix apps/helper-panel; node tools/install-helper-panel.mjs` | exit 0 and `site/panel/helper-tracker/` contains the built app |
| TTS static checks before retirement | `npm ci --ignore-scripts; npm rebuild esbuild; npm run check:site` | exit 0 |
| Workflow syntax inspection | `Get-Content .github/workflows/pages.yml` in each repository | exactly one workflow retains a public-site deploy job |
| Production canary | `Invoke-WebRequest https://vozen.org/ -UseBasicParsing; Invoke-WebRequest https://vozen.org/account/ -UseBasicParsing; Invoke-WebRequest https://vozen.org/panel/helper-tracker/ -UseBasicParsing` | all return HTTP 200 |

## Scope

**In scope**:

- `../vozen-org-ui-fix/.github/workflows/pages.yml`
- `../vozen-org-ui-fix/README.md` or an existing deployment document (only to
  state the canonical ownership)
- `../Vozen_TTS-auth-fix/.github/workflows/pages.yml`
- `../Vozen_TTS-auth-fix/README.md` and/or `DEPLOY.md`
- TTS Pages repository settings, manually performed by an authorized GitHub
  owner after the file changes are reviewed

**Out of scope**:

- Redesigning public pages or rewriting the Helper panel.
- Deleting the historical TTS `site/` directory in this plan.
- Changing API DNS, OAuth redirect URIs, secrets, or the production bot
  runtime.

## Git workflow

- Branches: `advisor/001-single-public-site` in each repository.
- Use focused conventional commits, for example
  `ci(site): make vozen-org the canonical Pages publisher`.
- The operator has granted push/deploy authority, but do not publish until all
  checks and the manual custom-domain confirmation below have completed.

## Steps

### Step 1: Record and protect canonical ownership

In `vozen-org-ui-fix`, add a short deployment-boundary section to the current
README or deployment documentation: this repository is the only source that
may publish `vozen.org`, including `/account/` and `/panel/helper-tracker/`.
State explicitly that `Vozen_TTS-auth-fix/site/` is legacy and must not deploy
the public domain.

Add a CI-visible guard in the canonical workflow or a small repository script
that fails when the canonical workflow is removed or stops building both
`docs-src` and `apps/helper-panel`. Keep it static and credential-free.

**Verify**: run the canonical site checks and `git diff --check` → exit 0.

### Step 2: Retire the competing TTS Pages publisher safely

In `Vozen_TTS-auth-fix`, replace the public deployment workflow with a
non-deploy verification/guard workflow, or disable it while retaining a clear
comment that public publishing moved to `Rexy40407/vozen-org`. The resulting
workflow must have no `pages: write`, no `id-token: write`, no
`configure-pages`, no `upload-pages-artifact`, and no `deploy-pages` action.

Do not delete TTS static files yet. Their removal is a separate migration after
an owner confirms no documentation or release automation still consumes them.

**Verify**:

```powershell
rg -n 'pages: write|id-token: write|configure-pages|upload-pages-artifact|deploy-pages' .github/workflows
```

Expected: no matches in `Vozen_TTS-auth-fix/.github/workflows`; `npm run
check:site` still exits 0 if the legacy tree remains checked.

### Step 3: Transfer and validate GitHub Pages domain ownership

An authorized GitHub owner must inspect both repositories' **Settings → Pages**
and ensure `vozen.org` is associated only with `Rexy40407/vozen-org`'s
`gh-pages` deployment. Remove/disable the domain from the TTS repository if it
is still assigned there. Wait for GitHub's domain/DNS verification before
deploying.

Record only the outcome and date in docs; never commit DNS tokens or the
verification file's secret value.

**Verify**: GitHub Pages settings show one owner, and the three production
canary requests in the Commands table return HTTP 200 after a canonical deploy.

### Step 4: Add a release regression check

Add a test or script in `vozen-org-ui-fix` that verifies a built release still
contains `site/account/index.html` and `site/panel/helper-tracker/` after
`tools/install-helper-panel.mjs` runs. Wire it into `npm run site:check` or an
existing documented release-check command.

**Verify**: run the full canonical workflow-equivalent commands locally or in
CI; every check exits 0.

## Test plan

- Verify the canonical workflow still builds documentation and the Helper
  panel before it publishes.
- Verify the TTS workflow contains no Pages deployment permissions/actions.
- Confirm the deployment artifact contains account and Helper panel routes.
- After release, fetch `/`, `/account/`, and `/panel/helper-tracker/` and
  require HTTP 200 from all three.

## Done criteria

- [x] Exactly one repository can deploy `vozen.org`.
- [x] The canonical workflow validates docs and the Helper panel before
  publication.
- [x] The TTS repository cannot re-enable Pages deployment through its normal
  workflow path.
- [x] GitHub Pages settings show one confirmed custom-domain owner.
- [x] Production canaries return HTTP 200 for all three public routes.
- [x] No file outside the in-scope list changed during the ownership migration.

## STOP conditions

- GitHub Pages settings show an unknown repository or organization owns
  `vozen.org`.
- DNS/OAuth configuration depends on the TTS Pages site.
- The canonical workflow cannot produce account and Helper panel artifacts.
- Retiring the TTS workflow would remove a non-public documentation deployment
  that cannot be identified from repository settings.

## Maintenance notes

- Every future public site feature belongs in `vozen-org-ui-fix`; TTS and
  Helper repositories may link to it but must not publish a competing copy.
- Reviewers should reject any new TTS Pages job with `pages: write` unless a
  separate domain is documented.
