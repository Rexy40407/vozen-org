import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

test('documentation examples use neutral member identities', () => {
  for (const source of ['tools/generate-starboard-demo.mjs', 'apps/helper-panel/src/feature-demo.ts', 'site/concepts/home-discord-poster.html']) {
    const content = readFileSync(new URL(`../../${source}`, import.meta.url), 'utf8');
    assert.doesNotMatch(content, /\balex\b/i, source);
  }
});

for (const asset of ['starboard-en', 'starboard-pt', 'suggestions-en', 'suggestions-pt', 'giveaways-en', 'giveaways-pt', 'tickets-en', 'tickets-pt', 'welcome-en', 'welcome-pt']) {
  test(`${asset} is an infinitely looping GIF, not a renamed video`, () => {
    const gif = readFileSync(new URL(`../../apps/helper-panel/public/feature-demos/${asset}.gif`, import.meta.url));
    assert.equal(gif.subarray(0, 6).toString(), 'GIF89a');
    const extension = gif.indexOf(Buffer.from('NETSCAPE2.0'));
    assert.ok(extension > 0);
    assert.deepEqual([...gif.subarray(extension + 11, extension + 16)], [3, 1, 0, 0, 0]);
    assert.ok(gif.length < 1_500_000, 'keep the illustration below 1.5MB');
  });
}
