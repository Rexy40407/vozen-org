import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve('.');
const manifest = JSON.parse(fs.readFileSync(path.join(root, 'docs-data/helper/helper-docs-manifest.json'), 'utf8'));
const overlays = JSON.parse(fs.readFileSync(path.join(root, 'docs-data/helper/module-overlays.json'), 'utf8'));

if (manifest.features.length !== 47) {
  throw new Error('Manifest must contain exactly 47 active features');
}

const keys = new Set();
const slugs = new Set();
for (const feature of manifest.features) {
  if (keys.has(feature.key) || feature.key.toLowerCase().includes('game')) {
    throw new Error(`Invalid duplicate or Games feature: ${feature.key}`);
  }
  keys.add(feature.key);

  const overlay = overlays[feature.key];
  if (!overlay) throw new Error(`Missing overlay: ${feature.key}`);
  if (slugs.has(overlay.slug)) throw new Error(`Duplicate slug: ${overlay.slug}`);
  slugs.add(overlay.slug);

  const file = path.join(root, 'site/docs/helper/modules', overlay.slug, 'index.html');
  if (!fs.existsSync(file)) throw new Error(`Missing page for ${feature.key}: ${file}`);
  const html = fs.readFileSync(file, 'utf8');
  if (feature.maturity === 'blocked') {
    if (!html.includes('Not currently available')) {
      throw new Error(`Blocked page lacks availability banner: ${feature.key}`);
    }
    if (/\bActivate\b|\bPublish configuration\b/i.test(html)) {
      throw new Error(`Blocked page contains activation language: ${feature.key}`);
    }
  } else if (!html.includes('Open in Helper panel')) {
    throw new Error(`Operational page lacks panel link: ${feature.key}`);
  }
}

const searchIndex = fs.readFileSync(path.join(root, 'site/docs/helper/search.json'), 'utf8');
// Educational pages may mention words such as “client secret” or “private key”.
// Only reject values that look like credentials, rather than the safety guidance itself.
const credentialPatterns = [
  /access[_ -]?token\s*[:=]\s*[A-Za-z0-9._-]{16,}/i,
  /client[_ -]?secret\s*[:=]\s*[A-Za-z0-9._-]{16,}/i,
  /(?:sk_live_|gh[pousr]_|xox[baprs]-)[A-Za-z0-9_-]{12,}/,
  /(?:guild|user|channel)[_ -]?id\s*[:=]\s*\d{16,}/i,
];
if (credentialPatterns.some(pattern => pattern.test(searchIndex))) {
  throw new Error('Credential-like value found in search index');
}

const featureStatusPage = fs.readFileSync(path.join(root, 'site/docs/helper/status/features/index.html'), 'utf8');
const statusCounts = manifest.features.reduce((counts, feature) => {
  const maturity = feature.maturity ?? 'planned';
  counts[maturity] = (counts[maturity] ?? 0) + 1;
  return counts;
}, { operational: 0, beta: 0, blocked: 0 });
for (const [label, count] of [
  ['Available', statusCounts.operational],
  ['Limited availability', statusCounts.beta],
  ['Unavailable', statusCounts.blocked],
]) {
  if (!featureStatusPage.includes(`${label} ${count}`)) {
    throw new Error(`Feature status summary has an incorrect ${label.toLowerCase()} count`);
  }
}
if (/\bBeta\b/.test(featureStatusPage)) {
  throw new Error('Feature status page must not present Helper as a beta');
}

console.log(`Documentation contract passed for ${manifest.features.length} features`);
