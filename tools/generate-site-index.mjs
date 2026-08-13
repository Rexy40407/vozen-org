import fs from 'node:fs';
import path from 'node:path';
import { absoluteCanonical, isIndexable, linkHref, walkHtml } from './site-meta-utils.mjs';

const root = path.resolve('site');
const urls = new Set();
for (const file of walkHtml(root)) {
  const relative = path.relative(root, file).replaceAll('\\', '/');
  const html = fs.readFileSync(file, 'utf8');
  if (!isIndexable(relative, html)) continue;
  const canonical = linkHref(html, 'canonical') || absoluteCanonical(relative, html);
  if (canonical.startsWith('https://vozen.org/')) urls.add(canonical);
}

const entries = [...urls].sort().map(url => `  <url><loc>${url}</loc></url>`).join('\n');
const sitemap = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${entries}\n</urlset>\n`;
fs.writeFileSync(path.join(root, 'sitemap.xml'), sitemap, 'utf8');
console.log(`Generated sitemap.xml with ${urls.size} public URLs`);
