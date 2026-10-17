import assert from 'node:assert/strict';
import fs from 'node:fs';
import { test } from 'node:test';
import { makeStoryboards } from '../../docs-data/docs-visual-content.mjs';
import { enhanceDocument, mediaMarkup, readPage, renderScene } from '../../tools/docs-visuals.mjs';

const features = JSON.parse(fs.readFileSync('docs-src/en/helper/_data/features.json', 'utf8')).features;
const boards = makeStoryboards(features);

test('every feature has its own grounded visual with the real schema and availability', () => {
  assert.equal(boards.filter(board => board.featureKey).length, 47);
  for (const feature of features) {
    const board = boards.find(board => board.featureKey === feature.key);
    assert.ok(board, feature.key);
    assert.equal(board.blocked, feature.maturity === 'blocked');
    assert.equal(board.route, `helper/modules/${feature.slug}/`);
    assert.equal(board.steps.length, 3);
    assert.ok(board.messages.length >= 2);
    for (const row of board.settings) assert.ok(feature.schema.sections.some(section => section.fields.some(field => field.key === row.key)));
  }
});

test('welcome and TTS reading teach different concrete examples, not a generic placeholder', () => {
  const welcome = boards.find(board => board.route === 'helper/guides/welcome/');
  const tts = boards.find(board => board.route === 'tts/text-to-speech/reading-messages/');
  assert.match(JSON.stringify(welcome), /#welcome/);
  assert.match(JSON.stringify(welcome), /Sam/);
  assert.match(JSON.stringify(tts), /#lounge/);
  assert.match(JSON.stringify(tts), /auto-read/);
  assert.notDeepEqual(welcome.messages, tts.messages);
});

test('media is accessible, responsive, opt-in, and honest about its provenance', () => {
  const board = boards.find(board => board.route === 'helper/guides/welcome/');
  const html = mediaMarkup(board);
  assert.match(html, /<picture>/);
  assert.match(html, /-mobile.webp/);
  assert.match(html, /alt="[^\"]+"/);
  assert.match(html, /Illustrated example/);
  assert.match(html, /[Ss]ample data/);
  assert.match(html, /preload="none"/);
  assert.doesNotMatch(html, /autoplay/);
  const blocked = mediaMarkup(boards.find(board => board.blocked));
  assert.match(blocked, /Unavailable/);
  assert.doesNotMatch(blocked, /Watch walkthrough/);
});

test('enhancement preserves article information and is idempotent', () => {
  const board = boards.find(board => board.route === 'helper/guides/welcome/');
  const source = '<!doctype html><html><body><main class="docs-main"><h1>Welcome</h1><p>Keep this information.</p><section><h2>Permissions</h2><p>Check role hierarchy.</p></section></main></body></html>';
  const once = enhanceDocument(source, board);
  const twice = enhanceDocument(once, board);
  assert.equal(once, twice);
  assert.match(once, /Keep this information/);
  assert.match(once, /Check role hierarchy/);
  assert.equal((once.match(/data-docs-visual-guide=/g) || []).length, 1);
  assert.ok(once.indexOf('data-docs-visual-guide') < once.indexOf('<section>'));
});

test('screens contain a real example, sample label and no live controls or identifiers', () => {
  for (const board of boards) {
    const html = renderScene(board, 'http://127.0.0.1:4183', false);
    assert.match(html, /ILLUSTRATED EXAMPLE/);
    assert.ok(html.includes(board.title.replaceAll('&', '&amp;')));
    assert.doesNotMatch(html, /<input|<form|[?&](?:token|guild_id)=/);
    if (board.blocked) assert.match(html, /UNAVAILABLE/);
  }
});

test('page discovery separates a moved URL from an article and rejects missing content', () => {
  assert.equal(readPage('<html><head><meta http-equiv="refresh" content="0;url=/docs/"></head><body><h1>Moved</h1></body></html>').redirect, true);
  assert.equal(readPage('<main><h1>Example <em>guide</em></h1></main>').title, 'Example  guide');
  assert.equal(readPage('<html><body>Nothing</body></html>').title, '');
  assert.throws(() => enhanceDocument('<body>No main</body>', boards[0]), /Missing article/);
});

test('unknown features cannot silently receive a generic illustration', () => {
  assert.throws(() => makeStoryboards([{ key: 'not-a-feature' }]), /Missing visual example/);
});

test('multi-command TTS examples use real line breaks', () => {
  for (const page of ['reading-messages', 'automatic-language-detection']) {
    const html = fs.readFileSync(`site/docs/tts/text-to-speech/${page}/index.html`, 'utf8');
    const examples = [...html.matchAll(/<pre\b[^>]*>\s*<code\b[^>]*>([\s\S]*?)<\/code>/g)];
    assert.ok(examples.length, page);
    for (const [, commands] of examples) {
      assert.doesNotMatch(commands, /\\n/, page);
      assert.match(commands, /\n/, page);
    }
  }
});

test('visual structure follows the subject instead of repeating a settings-and-output panel', () => {
  const examples = [
    ['helper/guides/welcome/', 'arrival'],
    ['tts/text-to-speech/reading-messages/', 'voice-route'],
    ['helper/modules/roles-and-progression/levels/', 'progression'],
    ['helper/modules/community/polls/', 'poll'],
    ['helper/troubleshooting/role-hierarchy/', 'hierarchy'],
    ['tts/text-to-speech/queue-behaviour/', 'queue'],
    ['tts/additional-tools/audio-files/', 'attachment'],
    ['helper/modules/alerts/instagram/', 'dependency'],
  ];
  for (const [route, presentation] of examples) {
    const board = boards.find(item => item.route === route);
    assert.ok(board, route);
    const html = renderScene(board, 'http://127.0.0.1:4183');
    assert.ok(html.includes(`data-presentation="${presentation}"`), route);
    assert.doesNotMatch(html, /class="settings"|class="output"/, route);
    for (const message of board.messages) assert.ok(html.includes(message.text.replaceAll('&', '&amp;')), route);
  }
});

test('the docs use varied instructional compositions, not arbitrary palette variants', () => {
  const presentations = new Set(boards.map(board => renderScene(board, 'http://127.0.0.1:4183').match(/data-presentation="([^"]+)"/)?.[1]));
  assert.ok(presentations.size >= 12, `Only ${presentations.size} visual compositions`);
  assert.equal(presentations.has(undefined), false);
  for (const board of boards.filter(item => item.blocked)) {
    assert.match(renderScene(board, 'http://127.0.0.1:4183'), /data-presentation="dependency"/);
  }
});

test('module instructions are feature-specific and welcome chooses relevant schema fields', () => {
  const modules = boards.filter(board => board.featureKey && !board.blocked);
  assert.equal(new Set(modules.map(board => board.steps.join(' / '))).size, modules.length);
  assert.deepEqual(boards.find(board => board.featureKey === 'support.welcome').settings.map(row => row.key), ['channel', 'message', 'autoRole']);
  const welcome = renderScene(boards.find(board => board.featureKey === 'support.welcome'), 'http://127.0.0.1:4183');
  assert.equal((welcome.match(/class="avatar bot"/g) || []).length, 1);
  assert.doesNotMatch(welcome, /data-step=|class="settings"|class="output"/);
});

test('result compositions do not repeat their primary event in a trailing annotation', () => {
  const welcome = renderScene(boards.find(board => board.route === 'helper/guides/welcome/'), 'http://127.0.0.1:4183');
  assert.equal((welcome.match(/joined Community Lab/gi) || []).length, 1);
  assert.doesNotMatch(welcome, /class="arrival-next"/);
  for (const route of ['helper/modules/alerts/instagram/', 'tts/text-to-speech/queue-behaviour/']) {
    const html = renderScene(boards.find(board => board.route === route), 'http://127.0.0.1:4183');
    assert.doesNotMatch(html, /class="example-notes"/, route);
  }
  const recovery = renderScene(boards.find(board => board.route === 'tts/troubleshooting/no-audio/'), 'http://127.0.0.1:4183');
  assert.match(recovery, /Inspect pause \/ engine \/ local output/);
});

test('sample cast replaces the removed name without merging the two speakers', () => {
  assert.doesNotMatch(JSON.stringify(boards), /\bAlex\b/i);
  for (const board of boards) assert.doesNotMatch(renderScene(board, 'http://127.0.0.1:4183'), /\bAlex\b/i);
  const voices = boards.find(board => board.route === 'tts/personal-configuration/default-voice/');
  assert.deepEqual(voices.messages.map(message => message.name), ['Sam', 'Riley']);
});

test('media offers accessible format selection while retaining a native no-JS walkthrough', () => {
  const board = boards.find(board => board.route === 'helper/guides/welcome/');
  const markup = mediaMarkup(board);
  assert.match(markup, /data-docs-media-tabs hidden/);
  assert.match(markup, /role="tab"[^>]+aria-selected="true"[^>]*>Image</);
  assert.match(markup, /role="tab"[^>]+aria-selected="false"[^>]*>Walkthrough</);
  assert.match(markup, /data-docs-video-panel><details/);
  assert.match(markup, /Open full-size image/);
  assert.doesNotMatch(renderScene(board, 'http://127.0.0.1:4183'), /class="scene-heading"/);
  const unavailable = mediaMarkup(boards.find(board => board.blocked));
  assert.doesNotMatch(unavailable, />Walkthrough</);
});
