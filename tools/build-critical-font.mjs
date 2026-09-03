import fs from 'node:fs';
import path from 'node:path';
import subsetFont from 'subset-font';

const checkOnly = process.argv.includes('--check');
const sourceRoot = path.resolve('tools', 'i18n-marketing-src');
const fontRoot = path.resolve('site', 'assets', 'fonts');
const titleKeys = [
  'home.heroTitle1',
  'home.heroTitle2',
  'hero.title1',
  'hero.title2',
  'helper.landing.heroTitle1',
  'helper.landing.heroTitle2',
];
const titleText = fs.readdirSync(sourceRoot)
  .filter((name) => name.endsWith('.json'))
  .flatMap((name) => {
    const messages = JSON.parse(fs.readFileSync(path.join(sourceRoot, name), 'utf8')).messages;
    return titleKeys.map((key) => messages[key] || '');
  })
  .concat(['Vozen', 'Vozen TTS', 'Vozen Helper'])
  .join('\n');

const subsets = [
  ['unbounded-500-latin.woff2', 'unbounded-critical-latin.woff2'],
  ['unbounded-500-latin-ext.woff2', 'unbounded-critical-latin-ext.woff2'],
  ['unbounded-500-cyrillic.woff2', 'unbounded-critical-cyrillic.woff2'],
];
const mismatches = [];

for (const [sourceName, outputName] of subsets) {
  const source = fs.readFileSync(path.join(fontRoot, sourceName));
  const expected = await subsetFont(source, titleText, { targetFormat: 'woff2' });
  const output = path.join(fontRoot, outputName);
  let current;
  try { current = fs.readFileSync(output); } catch { current = Buffer.alloc(0); }
  if (current.equals(expected)) continue;
  if (checkOnly) mismatches.push(outputName);
  else fs.writeFileSync(output, expected);
}

if (mismatches.length) {
  throw new Error(`critical font subsets are stale; run npm run build:font\n${mismatches.join('\n')}`);
}
const bytes = subsets.reduce((total, [, output]) => total + fs.statSync(path.join(fontRoot, output)).size, 0);
console.log(`[${checkOnly ? 'check' : 'build'}-critical-font] ${subsets.length} subsets are current (${bytes} bytes total)`);
