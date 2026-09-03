import lighthouse from 'lighthouse';
import { launch } from 'chrome-launcher';
import { chromium } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { createSiteServer } from './serve-site.mjs';

const routeArgument = process.argv.find((value) => value.startsWith('--route='));
const requestedRoute = routeArgument?.slice('--route='.length);
const routes = requestedRoute ? [requestedRoute] : ['/', '/tts/', '/helper/'];
const categoryMinimums = {
  performance: 0.85,
  accessibility: 0.95,
  'best-practices': 0.95,
  seo: 0.95,
};
const metricMaximums = {
  'largest-contentful-paint': 2_500,
  'total-blocking-time': 200,
  'cumulative-layout-shift': 0.1,
};

const { server, origin } = await createSiteServer();
const failures = [];
const writeReports = process.argv.includes('--reports');
if (writeReports) fs.mkdirSync(path.resolve('test-results', 'lighthouse'), { recursive: true });

try {
  for (const route of routes) {
    console.log(`[lighthouse] auditing ${route}`);
    const chrome = await launch({
      chromePath: chromium.executablePath(),
      chromeFlags: ['--headless=new', '--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage'],
    });
    let result;
    try {
      result = await lighthouse(`${origin}${route}`, {
        port: chrome.port,
        logLevel: 'error',
        output: 'json',
        onlyCategories: Object.keys(categoryMinimums),
        formFactor: 'mobile',
        screenEmulation: {
          mobile: true,
          width: 375,
          height: 812,
          deviceScaleFactor: 1,
          disabled: false,
        },
      });
    } finally {
      try { chrome.kill(); }
      catch (error) {
        if (error?.code !== 'EBUSY') throw error;
        console.warn(`[lighthouse] browser profile cleanup deferred: ${error.code}`);
      } finally {
        // chrome-launcher can keep its Windows child-process handle referenced
        // after taskkill succeeds but temporary-profile cleanup returns EBUSY.
        // Detaching that dead handle lets this CLI finish cleanly in CI.
        chrome.process?.removeAllListeners();
        chrome.process?.unref();
      }
    }
    if (!result?.lhr) throw new Error(`Lighthouse returned no report for ${route}`);
    if (writeReports) {
      const name = route === '/' ? 'home' : route.replaceAll('/', '');
      fs.writeFileSync(
        path.resolve('test-results', 'lighthouse', `${name}.json`),
        JSON.stringify(result.lhr),
      );
    }

    const categories = Object.fromEntries(
      Object.keys(categoryMinimums).map((id) => [id, result.lhr.categories[id]?.score ?? 0]),
    );
    const metrics = Object.fromEntries(
      Object.keys(metricMaximums).map((id) => [id, result.lhr.audits[id]?.numericValue ?? Number.POSITIVE_INFINITY]),
    );
    console.log(`[lighthouse] ${route} ${Object.entries(categories).map(([id, score]) => `${id}=${Math.round(score * 100)}`).join(' ')} LCP=${Math.round(metrics['largest-contentful-paint'])}ms TBT=${Math.round(metrics['total-blocking-time'])}ms CLS=${metrics['cumulative-layout-shift'].toFixed(3)}`);

    for (const [id, minimum] of Object.entries(categoryMinimums)) {
      if (categories[id] < minimum) failures.push(`${route} ${id} ${Math.round(categories[id] * 100)} < ${minimum * 100}`);
    }
    for (const [id, maximum] of Object.entries(metricMaximums)) {
      if (metrics[id] > maximum) failures.push(`${route} ${id} ${metrics[id]} > ${maximum}`);
    }
  }
} finally {
  await new Promise((resolve) => server.close(resolve));
}

if (failures.length) {
  throw new Error(`Lighthouse budgets failed:\n${failures.join('\n')}`);
}
console.log('[lighthouse] all public entry routes meet the release budgets');
