import fs from 'node:fs';
import path from 'node:path';
import {
  absoluteCanonical,
  escapeAttribute,
  isIndexable,
  linkHref,
  metaContent,
  relativeSiteAsset,
  titleContent,
  walkHtml,
} from './site-meta-utils.mjs';

const root = path.resolve('site');
const ogImage = 'https://vozen.org/assets/og-image.png';

function insertBeforeHeadEnd(html, block) {
  return html.includes('</head>') ? html.replace('</head>', `${block}\n  </head>`) : html;
}

function addMeta(html, attribute, value, content) {
  const pattern = new RegExp(`<meta\\b[^>]*${attribute}=["']${value}["'][^>]*>`, 'i');
  if (pattern.test(html)) return html;
  return insertBeforeHeadEnd(html, `    <meta ${attribute}="${value}" content="${escapeAttribute(content)}">`);
}

function addProperty(html, property, content) {
  return addMeta(html, 'property', property, content);
}

function addLink(html, rel, href, extra = '') {
  const pattern = new RegExp(`<link\\b[^>]*rel=["']${rel}["'][^>]*>`, 'i');
  if (pattern.test(html)) return html;
  return insertBeforeHeadEnd(html, `    <link rel="${rel}" href="${escapeAttribute(href)}"${extra}>`);
}

function addDescription(html, title, relative) {
  if (metaContent(html, 'description')) return html;
  const descriptions = {
    'privacy.html': 'Read how Vozen handles account, server and diagnostic data, and how to request deletion.',
    'terms.html': 'Terms governing use of the Vozen tools for Discord communities.',
    'status.html': 'Current availability and service health for Vozen services.',
  };
  const description = descriptions[relative] || `${title || 'Vozen'} — public information from Vozen.`;
  return addMeta(html, 'name', 'description', description);
}

function addStructuredData(html, title, description, canonical) {
  if (/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>/i.test(html)) return html;
  const type = canonical === 'https://vozen.org/' ? 'WebSite' : 'WebPage';
  const graph = {
    '@context': 'https://schema.org',
    '@type': type,
    name: title,
    description,
    url: canonical,
    isPartOf: { '@type': 'WebSite', name: 'Vozen', url: 'https://vozen.org/' },
    publisher: { '@type': 'Organization', name: 'Vozen', url: 'https://vozen.org/' },
  };
  return insertBeforeHeadEnd(html, `    <script type="application/ld+json">${JSON.stringify(graph)}</script>`);
}

for (const file of walkHtml(root)) {
  const relative = path.relative(root, file).replaceAll('\\', '/');
  let html = fs.readFileSync(file, 'utf8');
  if (!isIndexable(relative, html)) continue;

  const title = titleContent(html) || 'Vozen';
  html = addDescription(html, title, relative);
  const description = metaContent(html, 'description') || `${title} — public information from Vozen.`;
  const canonical = absoluteCanonical(relative, html);
  html = addLink(html, 'canonical', canonical);
  html = addProperty(html, 'og:site_name', 'Vozen');
  html = addProperty(html, 'og:type', 'website');
  html = addProperty(html, 'og:url', canonical);
  html = addProperty(html, 'og:title', title);
  html = addProperty(html, 'og:description', description);
  html = addProperty(html, 'og:image', ogImage);
  html = addProperty(html, 'og:image:alt', 'Vozen');
  html = addMeta(html, 'name', 'twitter:card', 'summary_large_image');
  html = addMeta(html, 'name', 'twitter:title', title);
  html = addMeta(html, 'name', 'twitter:description', description);
  html = addMeta(html, 'name', 'twitter:image', ogImage);
  html = addLink(html, 'icon', relativeSiteAsset(relative, 'favicon.svg'), ' type="image/svg+xml"');
  html = addStructuredData(html, title, description, canonical);
  fs.writeFileSync(file, html, 'utf8');
}

console.log('Enriched public page metadata');
