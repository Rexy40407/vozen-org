import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import vm from 'node:vm';

const source = readFileSync(new URL('../../site/docs/shared/docs-shell.js', import.meta.url), 'utf8');
const guard = source.slice(0, source.indexOf('  const docsRoot')) + 'window.guardPassed = (window.guardPassed || 0) + 1; })();';

test('prerendered ready markup still attaches runtime interactions, once per window', () => {
  const window = {};
  const document = { currentScript: {}, body: { dataset: { vozenDocsShell: 'ready' } } };
  const context = vm.createContext({ window, document });
  vm.runInContext(guard, context);
  vm.runInContext(guard, context);
  assert.equal(window.guardPassed, 1);
});

test('shell does not initialise without its script element', () => {
  const window = {};
  vm.runInNewContext(guard, { window, document: { currentScript: null } });
  assert.equal(window.guardPassed, undefined);
});

test('Helper runtime data includes its search corpus and real module routes', () => {
  const context = vm.createContext({});
  for (const file of ['search-data.js', 'data/helper-docs-manifest.js']) {
    vm.runInContext(readFileSync(new URL('../../site/docs/helper/' + file, import.meta.url), 'utf8'), context);
  }
  assert.ok(context.VOZEN_DOCS_SEARCH.helper.documents.length > 0);
  const routes = Object.values(context.VOZEN_DOCS_NAV.helper.routes);
  assert.equal(routes.length, 47);
  for (const route of routes) assert.ok(existsSync(new URL('../../site/docs/helper/' + route, import.meta.url)), route);
});
