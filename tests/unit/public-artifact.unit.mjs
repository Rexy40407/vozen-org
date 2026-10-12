import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, readFile, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { minifyAsset, buildPublicArtifact, isDevelopmentFile, htmlSignature } from '../../tools/build-public-artifact.mjs';

test('non-code assets remain unchanged and equivalent viewport whitespace is accepted', async () => {
  assert.equal(await minifyAsset('robots.txt', 'User-agent: *\n'), 'User-agent: *\n');
  assert.deepEqual(htmlSignature('<meta name="viewport" content="width=device-width, initial-scale=1">'), htmlSignature('<meta name="viewport" content="width=device-width,initial-scale=1">'));
});

test('HTML retains readable text, metadata, links, structured data and preformatted code', async () => {
  const html = `<!doctype html><html><head><title>Vozen TTS</title><meta name="description" content="Voice for Discord"><link rel="canonical" href="https://vozen.org/tts/"><script type="application/ld+json">{"name":"Vozen"}</script></head><body><!-- development note --><h1>Olá <em>mundo</em>!</h1><a href="/helper/">Helper</a><pre>  code\n    indentation</pre></body></html>`;
  const result = await minifyAsset('index.html', html);
  assert.ok(result.length < html.length);
  assert.ok(result.includes('Olá <em>mundo</em>!'));
  assert.ok(result.includes('<title>Vozen TTS</title>'));
  assert.ok(result.includes('content="Voice for Discord"'));
  assert.ok(result.includes('href="https://vozen.org/tts/"'));
  assert.ok(result.includes('href="/helper/"'));
  assert.ok(result.includes('{"name":"Vozen"}'));
  assert.ok(result.includes('  code\n    indentation'));
  assert.ok(!result.includes('development note'));
});

test('JavaScript keeps public globals and removes source map references', async () => {
  const result = await minifyAsset('app.js', '/* internal */ function publicHandler(value) { return value + 1; }\n//# sourceMappingURL=app.js.map');
  assert.ok(result.includes('publicHandler'));
  assert.ok(!result.includes('sourceMappingURL'));
  assert.ok(!result.includes('internal'));
  assert.equal(Function(`${result}; return publicHandler(4)`)(), 5);
});

test('CSS retains custom properties and removes map references', async () => {
  const result = await minifyAsset('app.css', ':root { --accent: #22ddcc; } .label { color: var(--accent); }\n/*# sourceMappingURL=app.css.map */');
  assert.ok(result.includes('--accent'));
  assert.ok(result.includes('var(--accent)'));
  assert.ok(!result.includes('sourceMappingURL'));
});

test('inline code is minified without removing license notices or structured data', async () => {
  const source = '<style>.title { color: red; }</style><script>/*! license */ function publicHandler(value) { return value; }</script><h1>Readable text</h1>';
  const result = await minifyAsset('index.html', source);
  assert.ok(result.includes('.title{color:red}'));
  assert.ok(result.includes('license'));
  assert.deepEqual(htmlSignature(result), htmlSignature(source));
});

test('development files are excluded but public operational files remain', () => {
  for (const path of ['app.js.map', '.env', '.git/config', 'node_modules/a.js', 'README.md', 'package.json', 'src/app.tsx', 'test/app.spec.js', 'concepts/index.html']) assert.ok(isDevelopmentFile(path), path);
  for (const path of ['.nojekyll', 'CNAME', '_headers', 'robots.txt', 'sitemap.xml', 'assets/font.woff2', 'js/i18n-public/en.js']) assert.ok(!isDevelopmentFile(path), path);
});

test('artifact preserves sources and binary assets, excluding development files', async () => {
  const root = await mkdtemp(join(tmpdir(), 'vozen-artifact-test-'));
  try {
    const source = join(root, 'source');
    const output = join(root, 'artifact');
    await mkdir(source);
    await writeFile(join(source, 'index.html'), '<html>\n<body><!-- note --><h1>Vozen</h1></body></html>');
    await writeFile(join(source, 'image.png'), Buffer.from([0, 1, 255]));
    await writeFile(join(source, 'index.js.map'), '{}');
    const before = await readFile(join(source, 'index.html'), 'utf8');
    const report = await buildPublicArtifact(source, output);
    assert.equal(await readFile(join(source, 'index.html'), 'utf8'), before);
    assert.deepEqual(await readFile(join(output, 'image.png')), Buffer.from([0, 1, 255]));
    assert.ok(!(await readdir(output)).includes('index.js.map'));
    assert.equal(report.files, 2);
    await assert.rejects(buildPublicArtifact(source, output), /exists/);
    await assert.rejects(buildPublicArtifact(source, join(source, 'nested')), /outside/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
