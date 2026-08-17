import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const [api, app, main] = await Promise.all([
  readFile(new URL('../apps/helper-panel/src/api.ts', import.meta.url), 'utf8'),
  readFile(new URL('../apps/helper-panel/src/App.tsx', import.meta.url), 'utf8'),
  readFile(new URL('../site/js/main-v51.js', import.meta.url), 'utf8'),
]);

assert.match(
  api,
  /const VOZEN_ACCOUNT_TOKEN_KEY = 'vozen\.ecosystem\.dtoken';/,
  'the Helper must reuse the first-party Vozen account session',
);
assert.match(
  api,
  /export async function bootstrapVozenAccountSession\(\): Promise<boolean>/,
  'the account-to-Helper bootstrap must be explicit and testable',
);
assert.match(
  api,
  /apiUrl\('\/api\/session\/vozen'\)/,
  'the account token must be exchanged only through the dedicated API endpoint',
);
assert.match(
  api,
  /credentials: 'include'/,
  'the exchange must establish the HttpOnly Helper cookie',
);
assert.doesNotMatch(
  api,
  /\/api\/session\/vozen[^\n]*[?&]token=/,
  'an OAuth token must never be placed in a URL',
);
assert.doesNotMatch(
  api,
  /window\.location[^\n]*vozen\.dtoken/,
  'an OAuth token must never be placed in browser navigation state',
);
assert.match(
  app,
  /await api\.bootstrapVozenAccountSession\(\);/,
  'the panel must bootstrap the shared session before loading protected data',
);
assert.match(
  main,
  /\/rust\/api\/logout/,
  'the account logout must revoke the shared Helper session cookie',
);

console.log('Helper panel Vozen session contract passed.');
