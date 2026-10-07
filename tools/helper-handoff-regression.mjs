import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const main = fs.readFileSync(new URL('../site/js/main-v51.js', import.meta.url), 'utf8');
const start = main.indexOf('  let helperSessionHandoffWired = false;');
const end = main.indexOf('  function cachedNavData()', start);
assert.ok(start >= 0 && end > start, 'Helper handoff source boundary');

async function scenario({ ready, repeated = 3, changeToken = false }) {
  let finish;
  let token = 'fixture-account-token-not-a-real-secret';
  const promise = new Promise(resolve => { finish = resolve; });
  const navigations = [];
  const messages = [];
  let handler;
  class Element {
    href = 'https://vozen.test/panel/helper/#/servers';
    closest(selector) { return selector.includes('a[') ? this : { append: element => messages.push(element) }; }
    setAttribute() {}
    removeAttribute() {}
  }
  const context = vm.createContext({
    Element,
    storedToken: () => token,
    bootstrapHelperSession: () => promise,
    document: {
      addEventListener: (_event, callback) => { handler = callback; },
      getElementById: () => null,
      createElement: () => ({ setAttribute() {} }),
    },
    window: { location: { assign: href => navigations.push(href) } },
    t: () => 'Could not reach the server. Please try again.',
  });
  vm.runInContext(`${main.slice(start, end)}\nwireHelperSessionHandoff();`, context);
  const target = new Element();
  for (let attempt = 0; attempt < repeated; attempt++) {
    handler({ target, button: 0, preventDefault() {}, defaultPrevented: false });
  }
  if (changeToken) token = null;
  finish(ready);
  await new Promise(resolve => setImmediate(resolve));
  return { navigations, messages };
}

assert.equal((await scenario({ ready: true })).navigations.length, 1, 'Repeated clicks must navigate only once');
const failed = await scenario({ ready: false });
assert.equal(failed.navigations.length, 0, 'Failed session bridge must not navigate into a redirect loop');
assert.equal(failed.messages.length, 1, 'Failed bridge must display an accessible retry message');
assert.equal((await scenario({ ready: true, changeToken: true })).navigations.length, 0, 'Changed/logged-out account must not navigate from a stale exchange');
console.log('Helper handoff behavior passed: single navigation, visible failure, stale-account guard.');
