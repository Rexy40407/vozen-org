import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const root = new URL('../site/panel/helper-tracker/', import.meta.url);
const [html, script, css] = await Promise.all([
  readFile(new URL('index.html', root), 'utf8'),
  readFile(new URL('tracker.js', root), 'utf8'),
  readFile(new URL('tracker.css', root), 'utf8'),
]);

assert.match(html, /<title>Vozen · Painel · Helper<\/title>/);
assert.match(html, /aria-live="polite"/);
assert.match(html, /href="https:\/\/vozen\.org\/panel\/helper\/"/);
assert.match(html, /href="https:\/\/rexy40407\.github\.io\/painel\/vozen\.html"/);
assert.match(html, /Servidores do Helper/);
assert.match(html, /Atividade recente/);
assert.match(script, /request\('\/health'\)/);
assert.match(script, /request\('\/api\/guilds'\)/);
assert.match(script, /request\('\/api\/config\/features'\)/);
assert.match(script, /request\('\/api\/activity\?limit=24'\)/);
assert.match(script, /credentials: 'include'/);
assert.match(script, /cardId === 'runtimeCard'/);
assert.match(script, /Date\.parse\(value\)/);
assert.match(css, /grid-template-columns:1fr 1fr 1\.36fr/);

console.log('Helper tracker static contract passed.');
