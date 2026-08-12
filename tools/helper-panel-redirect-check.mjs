import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const source = await readFile(new URL('../apps/helper-panel/src/main.tsx', import.meta.url), 'utf8');

assert.match(source, /import\.meta\.env\.PROD/);
assert.match(source, /window\.location\.replace\('\/panel\/helper-tracker\/'\)/);
assert.match(source, /<App\s*\/>/);

console.log('Helper panel production redirect contract passed.');
