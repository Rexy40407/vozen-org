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

## License

The website files retain the license and notices from the Vozen project. See
[`LICENSE`](LICENSE).
