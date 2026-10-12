import { mkdir, readdir, readFile, writeFile, copyFile } from 'node:fs/promises';
import { resolve, relative, dirname, extname, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { minify as minifyHtml } from 'html-minifier-terser';
import { minify as minifyJs } from 'terser';
import CleanCSS from 'clean-css';
import { parse } from 'parse5';
import assert from 'node:assert/strict';

export function isDevelopmentFile(path) {
  const parts = path.replaceAll('\\', '/').split('/');
  return parts.some(part => /^(?:node_modules|src|tests?|tools|concepts)$/.test(part) || (part.startsWith('.') && part !== '.nojekyll'))
    || /(?:\.(?:map|tsx?|jsx|scss|sass|less|md|log)|(?:^|\/)(?:package(?:-lock)?\.json|tsconfig[^/]*\.json))$/i.test(parts.join('/'))
    || /\.(?:test|spec)\.[cm]?js$/i.test(path);
}

export async function minifyAsset(path, source) {
  switch (extname(path).toLowerCase()) {
    case '.html':
      return minifyHtml(source, {
        collapseWhitespace: true, conservativeCollapse: true,
        removeComments: true, removeAttributeQuotes: false,
        removeOptionalTags: false,
        minifyCSS: { level: 1, rebase: false },
        minifyJS: { compress: false, mangle: false, format: { comments: /^!|@preserve|@license|copyright/i } },
      });
    case '.js':
    case '.mjs': {
      // Keep top-level globals and property names: other scripts may access them.
      const result = await minifyJs(source, { compress: false, mangle: { toplevel: false }, format: { comments: /^!|@preserve|@license|copyright/i }, sourceMap: false });
      return result.code;
    }
    case '.css': {
      const result = new CleanCSS({ level: 1, rebase: false, sourceMap: false }).minify(source);
      if (result.errors.length) throw new Error(`${path}: ${result.errors.join('; ')}`);
      return result.styles;
    }
    default: return source;
  }
}

// Compare machine-readable metadata, navigation and visible copy before publishing.
export function htmlSignature(html) {
  const texts = [];
  const metadata = [];
  const links = [];
  function visit(node) {
    const attrs = Object.fromEntries((node.attrs ?? []).map(({ name, value }) => [name, value]));
    if (node.tagName === 'meta' && attrs.name === 'viewport') attrs.content = attrs.content.replace(/\s+/g, '').replace(/=([\d.]+)(?=,|$)/g, (_, number) => `=${Number(number)}`);
    if (node.tagName === 'meta' || node.tagName === 'link' || node.tagName === 'html') metadata.push([node.tagName, Object.entries(attrs).sort()]);
    if (node.tagName === 'a') links.push(attrs.href ?? '');
    if (node.tagName === 'script' || node.tagName === 'style') {
      if (attrs.type === 'application/ld+json') metadata.push(JSON.parse(node.childNodes.map(child => child.value ?? '').join('')));
      return;
    }
    if (node.nodeName === '#text') texts.push(node.value);
    for (const child of node.childNodes ?? []) visit(child);
    if (node.content) visit(node.content);
  }
  visit(parse(html, { scriptingEnabled: false }));
  return { text: texts.join('').replace(/\s+/g, ' ').trim(), metadata, links };
}

export async function buildPublicArtifact(sourceDirectory, outputDirectory) {
  const source = resolve(sourceDirectory);
  const output = resolve(outputDirectory);
  if (source === output || output.startsWith(source + sep) || source.startsWith(output + sep)) throw new Error('Artifact must be outside the source tree');
  // Never overwrite an existing release or remove source files.
  await mkdir(output);
  const report = { files: 0, htmlPages: 0, excluded: [], originalBytes: 0, outputBytes: 0 };
  async function walk(directory) {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      const input = resolve(directory, entry.name);
      const path = relative(source, input);
      if (isDevelopmentFile(path)) { report.excluded.push(path); continue; }
      if (entry.isDirectory()) { await walk(input); continue; }
      if (!entry.isFile()) throw new Error(`Unsupported artifact entry: ${path}`);
      const target = resolve(output, path);
      await mkdir(dirname(target), { recursive: true });
      const bytes = await readFile(input);
      report.originalBytes += bytes.length;
      if (/\.(?:html|css|m?js)$/i.test(path)) {
        const original = bytes.toString('utf8');
        const minified = await minifyAsset(path, original);
        if (path.endsWith('.html')) {
          assert.deepEqual(htmlSignature(minified), htmlSignature(original), `${path}: minification changed copy, metadata or navigation`);
          report.htmlPages++;
        }
        assert.ok(!/sourceMappingURL\s*=/.test(minified), `${path}: source map reference`);
        await writeFile(target, minified);
        report.outputBytes += Buffer.byteLength(minified);
      } else {
        await copyFile(input, target);
        report.outputBytes += bytes.length;
      }
      report.files++;
    }
  }
  await walk(source);
  return report;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  console.log(JSON.stringify(await buildPublicArtifact('site', process.argv[2] ?? '.pages-artifact'), null, 2));
}
