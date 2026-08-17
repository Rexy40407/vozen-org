import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (relative) => fs.readFileSync(path.join(root, relative), 'utf8');

const main = read('site/js/main-v51.js');
const nav = read('site/js/global-nav-v1.js');
const dashboard = read('site/js/dashboard-v8.js');
const account = read('site/account/index.html');

assert.match(main, /const AUTH_CHANNEL_NAME = ["']vozen\.ecosystem\.auth\.v1["']/);
assert.match(main, /publishAuth\(\{ type: "request" \}\)/);
assert.match(main, /setStoredToken\(fromHash\.token\)/);
assert.doesNotMatch(main, /await bootstrapHelperSession\((?:fromHash\.token|tok)\)/);
assert.match(main, /fetchWithTimeout\(PREMIUM_API_BASE \+ "\/api\/me\/premium"/);
assert.doesNotMatch(main, /if \(!IS_ACCOUNT \|\| helperSessionHandoffWired\)/);
assert.match(main, /keepalive: true/);
assert.match(main, /void bootstrapHelperSession\(token\);/);
assert.doesNotMatch(main, /bootstrapHelperSession\(token\)\.finally\(\(\) => window\.location\.assign/);
assert.match(nav, /new BroadcastChannel\(AUTH_CHANNEL_NAME\)/);
assert.match(dashboard, /await waitForSharedSession\(\)/);
assert.doesNotMatch(account, /data-vozen-stripe/);

console.log('Shared auth and account loading contract passed.');
