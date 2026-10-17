import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { chromium } from 'playwright';
import { makeStoryboards } from '../docs-data/docs-visual-content.mjs';
import { enhanceDocument, escapeHtml, outputMarkup, readPage, renderScene, SCENE_SIZE } from './docs-visuals.mjs';
import { createSiteServer, closeSiteServer } from './serve-site.mjs';

const check = process.argv.includes('--check');
const generate = process.argv.includes('--generate');
const root = path.resolve('site/docs');
const media = path.join(root, 'media');
const manifestPath = path.join(media, 'visual-manifest.json');
const features = JSON.parse(fs.readFileSync('docs-src/en/helper/_data/features.json', 'utf8')).features;
const boards = makeStoryboards(features);
const byRoute = new Map(boards.map(board => [board.route, board]));
const pages = fs.readdirSync(root, { recursive: true }).filter(file => file.endsWith('index.html')).map(file => {
  const filename = path.join(root, file);
  const source = fs.readFileSync(filename, 'utf8');
  const route = file.replaceAll('\\', '/').replace(/index\.html$/, '');
  return { filename, source, route, ...readPage(source) };
}).filter(page => !page.redirect);
for (const page of pages) if (!byRoute.has(page.route)) throw new Error(`No authored visual storyboard: /docs/${page.route}`);
for (const board of boards) if (!pages.some(page => page.route === board.route)) throw new Error(`Visual storyboard points to missing page: ${board.route}`);

const rendererHash = createHash('sha256').update(renderScene.toString() + outputMarkup.toString() + escapeHtml.toString() + JSON.stringify(SCENE_SIZE) + fs.readFileSync('tools/docs-scene-layouts.mjs', 'utf8')).digest('hex');
const entries = boards.map(board => ({
  route: `/docs/${board.route}`, id: board.id,
  source: board.featureKey ? `docs-data/helper/helper-docs-manifest.json#${board.featureKey}` : `docs-data/docs-visual-content.mjs#${board.route}`,
  provenance: 'Owned UI illustration with fictional names and values; not a live Discord screenshot.',
  hash: createHash('sha256').update(rendererHash + JSON.stringify(board)).digest('hex'),
  image: `${board.id}.webp`, mobile: `${board.id}-mobile.webp`,
  ...(board.video ? { video: `${board.id}.mp4`, mobileVideo: `${board.id}-mobile.mp4` } : {}),
}));
const previous = fs.existsSync(manifestPath) ? JSON.parse(fs.readFileSync(manifestPath, 'utf8')).pages : [];
const needsAssets = entries.filter(entry => {
  const cached = previous.find(item => item.id === entry.id);
  let cachedHash = cached?.hash;
  try {
    const desktop = JSON.parse(fs.readFileSync(path.join(media, `${entry.image}.origin.json`), 'utf8'));
    const mobile = JSON.parse(fs.readFileSync(path.join(media, `${entry.mobile}.origin.json`), 'utf8'));
    cachedHash ||= desktop.hash;
    entry.sizes = cached?.sizes || { desktop: desktop.size, mobile: mobile.size };
  } catch {}
  return cachedHash !== entry.hash || !entry.sizes?.desktop || !entry.sizes?.mobile || [entry.image, entry.mobile, entry.video, entry.mobileVideo].filter(Boolean).some(file => !fs.existsSync(path.join(media, file)));
});
if (needsAssets.length && !generate) throw new Error(`${needsAssets.length} visual assets are missing or stale. Run npm run docs:media:generate.`);

function ffmpeg(args) {
  const result = spawnSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', ...args], { encoding: 'utf8', windowsHide: true });
  if (result.status !== 0) throw new Error(`ffmpeg failed: ${result.stderr || result.error}`);
}

if (generate && needsAssets.length) {
  fs.mkdirSync(media, { recursive: true });
  const work = path.resolve('output/docs-media-work');
  fs.mkdirSync(work, { recursive: true });
  const { server, origin } = await createSiteServer();
  const browser = await chromium.launch();
  let completed = 0;
  const queue = [...needsAssets];
  try {
    const worker = async () => {
      while (queue.length) {
        const entry = queue.shift();
        const board = boards.find(item => item.id === entry.id);
        entry.sizes = {};
        for (const mobile of [false, true]) {
          const { width, height } = mobile ? SCENE_SIZE.mobile : SCENE_SIZE.desktop;
          const context = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: 1, reducedMotion: 'reduce' });
          await context.route('**/*', route => new URL(route.request().url()).origin === origin ? route.continue() : route.abort());
          const page = await context.newPage();
          await page.setContent(renderScene(board, origin, mobile));
          await page.evaluate(() => document.fonts.ready);
          const fittedHeight = await page.locator('.scene').evaluate(node => Math.ceil(node.getBoundingClientRect().height / 2) * 2);
          await page.setViewportSize({ width, height: fittedHeight });
          const overflow = await page.evaluate(() => [...document.querySelectorAll('.scene, .scene-content')].filter(node => node.scrollHeight > node.clientHeight + 2 || node.scrollWidth > node.clientWidth + 2).map(node => node.className));
          if (overflow.length) throw new Error(`${entry.id} ${mobile ? 'mobile' : 'desktop'} clips content: ${overflow.join(', ')}`);
          const png = path.join(work, `${entry.id}${mobile ? '-mobile' : ''}.png`);
          await page.screenshot({ path: png });
          const output = path.join(media, mobile ? entry.mobile : entry.image);
          ffmpeg(['-i', png, '-c:v', 'libwebp', '-quality', '86', '-compression_level', '6', output]);
          const size = { width, height: fittedHeight };
          entry.sizes[mobile ? 'mobile' : 'desktop'] = size;
          fs.writeFileSync(`${output}.origin.json`, JSON.stringify({ origin: entry.provenance, source: entry.source, generator: 'tools/build-docs-visuals.mjs', hash: entry.hash, size }, null, 2) + '\n');
          await context.close();
        }
        if (entry.video) for (const mobile of [false, true]) {
          const size = entry.sizes[mobile ? 'mobile' : 'desktop'];
          const context = await browser.newContext({ viewport: size, recordVideo: { dir: work, size } });
          await context.route('**/*', route => new URL(route.request().url()).origin === origin ? route.continue() : route.abort());
          const page = await context.newPage();
          await page.setContent(renderScene(board, origin, mobile));
          await page.evaluate(() => document.fonts.ready);
          // The three phases are an authored walkthrough, not recorded Discord actions.
          for (let phase = 0; phase < 3; phase++) {
            await page.evaluate(value => {
              document.body.dataset.phase = String(value);
            }, phase);
            await page.waitForTimeout(3000);
          }
          const recording = await page.video().path();
          await context.close();
          ffmpeg(['-i', recording, '-an', '-c:v', 'libopenh264', '-b:v', '450k', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', '-metadata', `comment=${entry.provenance}`, path.join(media, mobile ? entry.mobileVideo : entry.video)]);
        }
        console.log(`[docs-media] ${++completed}/${needsAssets.length} ${entry.id}${entry.video ? ' + walkthrough' : ''}`);
      }
    };
    await Promise.all([worker(), worker(), worker()]);
  } finally {
    await browser.close();
    await closeSiteServer(server);
  }
}
for (const page of pages) {
  const board = byRoute.get(page.route);
  const expected = enhanceDocument(page.source, { ...board, sizes: entries.find(entry => entry.id === board.id).sizes });
  if (check && expected !== page.source) throw new Error(`Visual markup is stale: ${page.route}`);
  if (!check && expected !== page.source) fs.writeFileSync(page.filename, expected);
}
const manifest = JSON.stringify({ version: 1, pages: entries }, null, 2) + '\n';
if (check) {
  if (!fs.existsSync(manifestPath) || fs.readFileSync(manifestPath, 'utf8') !== manifest) throw new Error('Visual manifest is stale.');
  for (const entry of entries) {
    for (const file of [entry.image, entry.mobile]) if (fs.statSync(path.join(media, file)).size > 200 * 1024) throw new Error(`Visual exceeds 200KB: ${file}`);
    for (const file of [entry.video, entry.mobileVideo].filter(Boolean)) if (fs.statSync(path.join(media, file)).size > 2 * 1024 * 1024) throw new Error(`Walkthrough exceeds 2MB: ${file}`);
  }
} else {
  fs.mkdirSync(media, { recursive: true });
  fs.writeFileSync(manifestPath, manifest);
}
console.log(`${check ? 'Checked' : 'Built'} page-specific visuals for ${pages.length} docs pages, ${entries.filter(entry => entry.video).length} silent walkthroughs.`);
