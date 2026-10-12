# vozen.org

Public website for Vozen. This repository contains only the static marketing,
documentation, legal and account pages published at [vozen.org](https://vozen.org).

The Discord bots and the authenticated Vozen panel live in separate repositories:

- `Vozen_TTS` — the Vozen TTS bot;
- `vozen-helper` — the Vozen Helper runtime and API;
- `Vozen_Helper` — the public Helper/Vozen panel while the panel source remains public.

No secrets belong in this repository. API calls made by the site go through the
public API endpoints and authenticated sessions; provider credentials stay on the
VPS.

## Local preview

Serve the `site/` directory with any static HTTP server, for example:

```powershell
python -m http.server 4173 --directory site
```

## Deployment

Every push to `main` deploys `site/` through GitHub Pages. The `CNAME` file keeps
the custom domain on `vozen.org`.

This repository is the sole public-site publisher for `vozen.org`, including
`/account/` and `/panel/helper-tracker/`. The TTS and Helper runtime
repositories may build legacy documentation for verification, but must not
publish a competing Pages artifact for this domain.

## HTML rendering and indexing

`npm run build` generates public documentation and locale routes, then prerenders
public navigation, command catalogues, FAQs and documentation sidebars with a
fresh local browser. The build blocks external requests and does not use account
sessions or API responses. Both TTS and Helper commands are in the raw catalogue
HTML; JavaScript adds search and filters. Public links and article text work with
JavaScript disabled. The final sitemap is generated from the completed HTML.

`npm run site:check` checks raw HTML, per-page metadata, canonicals, navigation and
sitemap coverage. `npx playwright test tests/prerender.spec.mjs` verifies visits
with JavaScript disabled and progressive command filtering.

GitHub Pages can serve fully prerendered public pages, but it does not run an
application server for request-time SSR. The account and Helper panel therefore
provide static introductory HTML and remain `noindex`; authenticated user/server
data and live service status still come from APIs after JavaScript starts. Rendering
those values in the initial response would require hosting the affected routes on
a server or worker that handles authentication. Redirect aliases canonicalize to
their destination rather than becoming duplicate indexable pages.

## License

The website files retain the license and notices from the Vozen project. See
[`LICENSE`](LICENSE).
