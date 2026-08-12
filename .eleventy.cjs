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
    const escape = value => String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    const title = escape(this.data?.title || 'Vozen Helper documentation');
    const description = escape(this.data?.description || 'Original documentation for configuring Vozen Helper.');
    return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="description" content="${description}">
    <link rel="canonical" href="https://vozen.org${this.page.url || '/docs/helper/'}">
    <title>${title} - Vozen Helper</title>
    <link rel="stylesheet" href="/docs/helper/assets/docs.css">
    <link rel="stylesheet" href="/css/global-nav-v1.css?v=ecosystem-shell-v2">
  </head>
  <body>
    <a class="skip-link" href="#main">Skip to content</a>
    <div data-vozen-nav data-nav-root="/" data-nav-current="docs" data-nav-product="Ecosystem"></div>
    <header class="docs-header">
      <a class="brand" href="/docs/helper/">Vozen <span>Helper</span></a>
      <nav aria-label="Primary">
        <a href="/docs/helper/get-started/quick-setup/">Quick Setup</a>
        <a href="/docs/helper/modules/">Modules</a>
        <a href="/docs/helper/guides/protect-a-server/">Guides</a>
        <a href="/docs/helper/reference/commands/">Reference</a>
        <a href="/docs/helper/troubleshooting/bot-not-responding/">Troubleshooting</a>
      </nav>
      <form class="search-form" action="/docs/helper/" role="search">
        <label class="sr-only" for="docs-search">Search documentation</label>
        <input id="docs-search" name="q" type="search" placeholder="Search docs" autocomplete="off">
        <div id="search-results" class="search-results" aria-live="polite"></div>
      </form>
    </header>
    <main id="main" class="docs-main">${content}</main>
    <footer class="docs-footer">
      <span>Vozen Helper documentation</span>
      <span><a href="/privacy.html">Privacy</a> - <a href="/terms.html">Terms</a></span>
    </footer>
    <script src="/docs/helper/assets/minisearch.min.js"></script>
    <script src="/docs/helper/assets/docs.js"></script>
    <script src="/js/global-nav-v1.js?v=ecosystem-shell-v2"></script>
  </body>
</html>`;
  });
  return {
    dir: { input: 'docs-src/en/helper', includes: '_includes', layouts: '', data: '_data', output: 'site/docs/helper' },
    templateFormats: ['md', 'njk'], markdownTemplateEngine: 'njk', htmlTemplateEngine: 'njk', pathPrefix: '/docs/helper/',
  };
};
