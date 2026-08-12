import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const [source, viteConfig, installer] = await Promise.all([
  readFile(new URL('../apps/helper-panel/src/main.tsx', import.meta.url), 'utf8'),
  readFile(new URL('../apps/helper-panel/vite.config.ts', import.meta.url), 'utf8'),
  readFile(new URL('../tools/install-helper-panel.mjs', import.meta.url), 'utf8'),
]);

assert.doesNotMatch(source, /window\.location\.replace\(/);
assert.match(source, /createRoot\(document\.getElementById\('root'\)!\)\.render\(/);
assert.match(source, /<App\s*\/>/);
assert.match(viteConfig, /'\/panel\/helper-tracker\/'/);
assert.match(installer, /site\/panel\/helper-tracker/);
assert.match(installer, /\/panel\/helper-tracker\//);

console.log('Helper panel production route contract passed.');
