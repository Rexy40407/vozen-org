const fs = require('node:fs');
const path = require('node:path');

module.exports = function (eleventyConfig) {
  eleventyConfig.addLayoutAlias('base', 'base.njk');
  eleventyConfig.addLayoutAlias('module', 'module.njk');
  eleventyConfig.addPassthroughCopy({
    'docs-src/en/helper/assets': 'assets',
    'docs-data/helper/helper-docs-manifest.json': 'data/helper-docs-manifest.json',
  });
  eleventyConfig.addFilter('json', value => JSON.stringify(value));
  eleventyConfig.addFilter('prettyStatus', value => ({
    operational: 'Available', beta: 'Beta', planned: 'Planned', blocked: 'Unavailable', degraded: 'Degraded',
  }[value] || value));
  eleventyConfig.addFilter('lower', value => String(value || '').toLowerCase());
  eleventyConfig.addFilter('dateOnly', value => String(value || '').slice(0, 10));
  eleventyConfig.addGlobalData('site', {
    name: 'Vozen Helper documentation', canonical: 'https://vozen.org/docs/helper/', language: 'en',
  });
  const helperDocsPath = path.join(__dirname, 'docs-src', 'en', 'helper', '_data', 'features.json');
  const helperDocs = JSON.parse(fs.readFileSync(helperDocsPath, 'utf8'));
  eleventyConfig.addGlobalData('helperDocs', helperDocs);
  eleventyConfig.addNunjucksGlobal('helperDocs', helperDocs);
  for (const ignored of ['base.njk', 'module.njk', 'modules/module-page.njk']) {
    eleventyConfig.ignores.add(`docs-src/en/helper/${ignored}`);
  }
  eleventyConfig.addTransform('vozen-helper-shell', function (content) {
    const outputPath = this.page && this.page.outputPath ? String(this.page.outputPath).replaceAll('\\', '/') : '';
    if (!outputPath.includes('/site/docs/helper/')) return content;
    const helperOutput = outputPath.slice(outputPath.indexOf('/site/docs/helper/') + '/site/docs/helper/'.length);
    const directoryDepth = Math.max(0, helperOutput.split('/').filter(Boolean).length - 1);
    const helperRoot = directoryDepth ? '../'.repeat(directoryDepth) : './';
    const docsRoot = `${helperRoot}../`;
    const siteRoot = `${helperRoot}../../`;
    const canonicalPath = (`/docs/helper/${helperOutput.replace(/index\.html$/, '')}`).replace(/\/+/g, '/');
    const escape = value => String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    const pageData = this.page?.data || this.data || {};
    const stripMarkup = value => String(value || '')
      .replace(/<[^>]*>/g, '')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/\s+/g, ' ')
      .trim();
    const heading = stripMarkup(content.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/i)?.[1]);
    const rawTitle = pageData.title && pageData.title !== 'Vozen Helper documentation'
      ? pageData.title
      : heading || 'Vozen Helper documentation';
    const rawDescription = pageData.description && pageData.description !== 'Original documentation for configuring Vozen Helper.'
      ? pageData.description
      : `Learn how to configure ${rawTitle} in Vozen Helper, check requirements, and recover safely.`;
    const pathTitle = canonicalPath.includes('/status/features/')
      ? 'Feature maturity and availability'
      : canonicalPath.includes('/get-started/feature-status/')
        ? 'Understanding feature status'
        : null;
    const pageTitle = pathTitle || (canonicalPath.includes('/modules/') ? `${rawTitle} module` : rawTitle);
    const title = escape(pageTitle);
    const description = escape(rawDescription);
    const canonical = `https://vozen.org${canonicalPath}`;
    const structuredData = JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'TechArticle',
      headline: rawTitle,
      description: rawDescription,
      url: canonical,
      isPartOf: { '@type': 'WebSite', name: 'Vozen', url: 'https://vozen.org/' },
      publisher: { '@type': 'Organization', name: 'Vozen', url: 'https://vozen.org/' },
    });
    const localContent = content
      .replaceAll('href="/docs/helper/', `href="${helperRoot}`)
      .replaceAll('src="/docs/helper/', `src="${helperRoot}`)
      .replaceAll('action="/docs/helper/', `action="${helperRoot}`)
      .replaceAll('href="/docs/shared/', `href="${docsRoot}shared/`)
      .replaceAll('src="/docs/shared/', `src="${docsRoot}shared/`)
      .replaceAll('href="/privacy.html"', `href="${siteRoot}privacy.html"`)
      .replaceAll('href="/terms.html"', `href="${siteRoot}terms.html"`);
    return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="description" content="${description}">
    <link rel="canonical" href="${canonical}">
    <meta property="og:site_name" content="Vozen">
    <meta property="og:type" content="article">
    <meta property="og:url" content="${canonical}">
    <meta property="og:title" content="${title} - Vozen Helper">
    <meta property="og:description" content="${description}">
    <meta property="og:image" content="https://vozen.org/assets/og-image.png">
    <meta property="og:image:alt" content="Vozen">
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="${title} - Vozen Helper">
    <meta name="twitter:description" content="${description}">
    <meta name="twitter:image" content="https://vozen.org/assets/og-image.png">
    <meta name="robots" content="index,follow">
    <link rel="icon" href="${siteRoot}favicon.svg" type="image/svg+xml">
    <script type="application/ld+json">${structuredData}</script>
    <title>${title} - Vozen Helper</title>
    <link rel="stylesheet" href="${helperRoot}assets/docs.css?v=ecosystem-nav-v12">
    <link rel="stylesheet" href="${docsRoot}shared/docs-shell.css?v=ecosystem-nav-v12">
  </head>
  <body data-docs-product="helper">
    <a class="skip-link" href="#main">Skip to content</a>
    <div data-vozen-nav data-nav-root="${siteRoot}" data-nav-current="docs" data-nav-product="Ecosystem" data-nav-surface="docs"></div>
    <header class="docs-header">
      <a class="brand" href="${helperRoot}">Vozen <span>Helper</span></a>
      <nav aria-label="Primary">
        <a href="${helperRoot}get-started/quick-setup/">Quick Setup</a>
        <a href="${helperRoot}modules/">Modules</a>
        <a href="${helperRoot}guides/protect-a-server/">Guides</a>
        <a href="${helperRoot}reference/commands/">Reference</a>
        <a href="${helperRoot}troubleshooting/bot-not-responding/">Troubleshooting</a>
      </nav>
      <form class="search-form" action="${helperRoot}" role="search">
        <label class="sr-only" for="docs-search">Search documentation</label>
        <input id="docs-search" name="q" type="search" placeholder="Search docs" autocomplete="off">
        <div id="search-results" class="search-results" aria-live="polite"></div>
      </form>
    </header>
    <main id="main" class="docs-main">${localContent}</main>
    <footer class="docs-footer">
      <span>Vozen Helper documentation</span>
      <span><a href="${siteRoot}privacy.html">Privacy</a> - <a href="${siteRoot}terms.html">Terms</a></span>
    </footer>
    <script src="${docsRoot}shared/docs-shell.js?v=ecosystem-nav-v12"></script>
    <script src="${siteRoot}js/global-nav-v1.js?v=ecosystem-nav-v12"></script>
  </body>
</html>`;
  });
  return {
    dir: { input: 'docs-src/en/helper', includes: '_includes', layouts: '', data: '_data', output: 'site/docs/helper' },
    templateFormats: ['md', 'njk'], markdownTemplateEngine: 'njk', htmlTemplateEngine: 'njk', pathPrefix: '/docs/helper/',
  };
};
