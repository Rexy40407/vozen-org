import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const manifestPath = path.join(root, 'docs-data', 'helper', 'helper-docs-manifest.json');
const overlaysPath = path.join(root, 'docs-data', 'helper', 'module-overlays.json');
const outputDir = path.join(root, 'docs-src', 'en', 'helper', 'modules', 'generated');
const moduleContentPath = path.join(root, 'docs-src', 'en', 'helper', '_includes', 'module-content.njk');
const dataDir = path.join(root, 'docs-src', 'en', 'helper', '_data');

const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
const overlays = JSON.parse(fs.readFileSync(overlaysPath, 'utf8'));
const moduleContent = fs.readFileSync(moduleContentPath, 'utf8');

if (!Array.isArray(manifest.features) || manifest.features.length !== 47) {
  throw new Error(`Expected exactly 47 features in the helper manifest, got ${manifest.features?.length ?? 0}`);
}

fs.rmSync(outputDir, { recursive: true, force: true });
fs.mkdirSync(outputDir, { recursive: true });
fs.mkdirSync(dataDir, { recursive: true });

const escapeYaml = (value) => String(value ?? '')
  .replaceAll('\\', '\\\\')
  .replaceAll('"', '\\"')
  .replaceAll('\n', ' ')
  .trim();

const taskLabels = {
  protect: 'Protect my server',
  welcome: 'Welcome new members',
  community: 'Build community',
  manage: 'Moderate and automate',
  support: 'Support members',
  use: 'Use utilities',
  understand: 'Understand activity and health',
  personalize: 'Personalize the XP card',
  alerts: 'Publish external alerts',
  grow: 'Grow the server',
  web3: 'Explore read-only Web3',
};
const fallbackTask = (category) => ({
  protection: 'protect', community: 'community', support: 'support', management: 'manage',
  utility: 'use', insights: 'understand', studio: 'personalize', social: 'alerts',
  growth: 'grow', web3: 'web3',
}[category] || 'community');
const titleCase = (value) => String(value || '').split(/[._-]+/).filter(Boolean)
  .map(part => part.charAt(0).toUpperCase() + part.slice(1)).join(' ');
const features = manifest.features.map((raw) => {
  const overlay = overlays[raw.key];
  const slug = String(overlay.slug).replace(/^\/+|\/+$/g, '');
  const blocked = raw.maturity === 'blocked';
  return {
    ...raw,
    title: overlay.title || raw.title || titleCase(raw.key.split('.').pop()),
    summary: overlay.description || raw.summary || '',
    slug,
    taskGroup: overlay.taskGroup || fallbackTask(raw.category),
    audience: overlay.audience || 'server-managers',
    configurable: blocked ? false : Boolean(raw.configurable),
    available: !blocked,
    // The product is publicly available. A module that still depends on an
    // external integration can be honestly described as limited without
    // presenting the whole product (or an individual module) as a beta.
    statusLabel: blocked ? 'Unavailable' : raw.maturity === 'beta' ? 'Limited availability' : 'Available',
  };
});
const statusCounts = features.reduce((counts, feature) => {
  const maturity = feature.maturity ?? 'planned';
  counts[maturity] = (counts[maturity] ?? 0) + 1;
  return counts;
}, { operational: 0, beta: 0, blocked: 0, planned: 0, degraded: 0 });
const featureData = {
  ...manifest,
  features,
  statusCounts,
  byKey: Object.fromEntries(features.map(feature => [feature.key, feature])),
  tasks: Object.entries(taskLabels).map(([key, label]) => ({
    key,
    label,
    features: features.filter(feature => feature.taskGroup === key),
  })),
  taskLabels,
};
fs.writeFileSync(path.join(dataDir, 'features.json'), `${JSON.stringify(featureData, null, 2)}\n`, 'utf8');

for (const feature of [...manifest.features].sort((a, b) => a.key.localeCompare(b.key))) {
  const overlay = overlays[feature.key];
  if (!overlay?.slug) {
    throw new Error(`Missing editorial overlay slug for ${feature.key}`);
  }

  const fileName = `${feature.key.replace(/[^a-z0-9]+/gi, '-')}.njk`;
  const slug = String(overlay.slug).replace(/^\/+|\/+$/g, '');
  const content = `---
title: "${escapeYaml(overlay.title || feature.title)}"
description: "${escapeYaml(overlay.description || feature.summary)}"
featureKey: "${escapeYaml(feature.key)}"
permalink: "/modules/${escapeYaml(slug)}/"
---
{% set feature = helperDocs.byKey[featureKey] %}
${moduleContent}
`;
  fs.writeFileSync(path.join(outputDir, fileName), content, 'utf8');
}

console.log(`Generated ${manifest.features.length} concrete module pages.`);
