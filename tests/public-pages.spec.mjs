import { test, expect } from '@playwright/test';

const entryPages = ['/', '/tts/', '/helper/'];
const widths = [320, 375, 768, 1024, 1440];

test.beforeEach(async ({ page }) => {
  // Keep browser QA deterministic when CI or a sandbox blocks the optional
  // third-party analytics script. All first-party resources remain real.
  await page.route('https://static.cloudflareinsights.com/**', (route) =>
    route.fulfill({ status: 200, contentType: 'text/javascript', body: '' }));
});

test('the TTS install result explains the first-value path without analytics', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 812 });
  await page.goto('/dashboard/?installed=1&install=installed', { waitUntil: 'networkidle' });

  await expect(page.getByRole('heading', { name: 'Vozen TTS is in your server' })).toBeVisible();
  await expect(page.locator('[data-install-outcome="installed"] li')).toHaveCount(3);
  await expect(page.getByText('/setup', { exact: true })).toBeVisible();
  await expect(page.locator('script[src*="cloudflareinsights"]')).toHaveCount(0);
  await expect(page.locator('[data-cf-beacon]')).toHaveCount(0);
  const overflow = await page.evaluate(() => ({
    viewport: document.documentElement.clientWidth,
    content: document.documentElement.scrollWidth,
  }));
  expect(overflow.content, JSON.stringify(overflow)).toBeLessThanOrEqual(overflow.viewport + 1);
});

test('the TTS install result exposes a useful cancellation state', async ({ page }) => {
  await page.goto('/dashboard/?installed=0&install=cancelled', { waitUntil: 'networkidle' });

  await expect(page.getByRole('heading', { name: 'Installation cancelled' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Try again' })).toHaveAttribute(
    'href',
    'https://api.vozen.org/api/install/tts/start?source=home',
  );
});

for (const path of entryPages) {
  for (const width of widths) {
    test(`${path} has no console, resource or horizontal-overflow failures at ${width}px`, async ({ page }) => {
      const consoleErrors = [];
      const failedResources = [];
      page.on('console', (message) => {
        if (message.type() === 'error') consoleErrors.push(message.text());
      });
      page.on('response', (response) => {
        if (response.status() >= 400) failedResources.push(`${response.status()} ${response.url()}`);
      });
      page.on('requestfailed', (request) => failedResources.push(`FAILED ${request.url()}`));
      await page.setViewportSize({ width, height: width < 640 ? 812 : 900 });
      await page.goto(path, { waitUntil: 'networkidle' });
      await expect(page.locator('h1')).toHaveCount(1);
      const overflow = await page.evaluate(() => ({
        viewport: document.documentElement.clientWidth,
        content: document.documentElement.scrollWidth,
        height: document.documentElement.scrollHeight,
      }));
      expect(overflow.content, JSON.stringify(overflow)).toBeLessThanOrEqual(overflow.viewport + 1);
      if (path !== '/') {
        expect(overflow.height, `${path}: full-page CSS generation height at ${width}px`).toBeLessThanOrEqual(24_000);
      }
      const clippedPrimaryContent = await page.locator('h1, h1 span, .hero__cta a, .helper-hero__actions a, .eco-home-hero__actions a').evaluateAll((nodes) =>
        nodes.filter((node) => {
          const style = getComputedStyle(node);
          if (style.display === 'none' || style.visibility === 'hidden') return false;
          const rect = node.getBoundingClientRect();
          const paintsOutsideOwnBox = node.scrollWidth > node.clientWidth + 1;
          return rect.width > 0 && (rect.left < -1 || rect.right > window.innerWidth + 1 || paintsOutsideOwnBox);
        }).map((node) => ({
          tag: node.tagName,
          text: node.textContent?.trim().slice(0, 80),
          rect: node.getBoundingClientRect().toJSON(),
        })),
      );
      expect(clippedPrimaryContent).toEqual([]);
      expect(consoleErrors).toEqual([]);
      expect(failedResources).toEqual([]);
    });
  }
}

test('localized entry routes expose their own language, title and translated copy', async ({ page }) => {
  const samples = [
    ['/fr/', 'fr', 'Un seul foyer.'],
    ['/de/tts/', 'de', 'Kein Mikro?'],
    ['/pt/helper/', 'pt-PT', 'Uma ajuda mais inteligente'],
    ['/ar/helper/', 'ar', 'مساعدة أذكى'],
    ['/zh/tts/', 'zh-Hant', '没有麦克风？'],
  ];
  for (const [path, language, copy] of samples) {
    await page.goto(path, { waitUntil: 'networkidle' });
    await expect(page.locator('html')).toHaveAttribute('lang', language);
    await expect(page.locator('h1')).toContainText(copy);
    await expect(page).toHaveTitle(/Vozen/);
    if (language === 'ar') await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
  }
});

test('the localized Helper page exposes translated product copy and a real accessible FAQ', async ({ page }) => {
  await page.goto('/pt/helper/', { waitUntil: 'networkidle' });

  await expect(page.locator('#outcomes-title')).toContainText('O trabalho à volta do teu servidor, mais leve.');
  const faq = page.locator('#helper-faq');
  await expect(faq.getByRole('heading', { name: 'Perguntas, respondidas' })).toBeVisible();
  const questions = faq.locator('details');
  await expect(questions).toHaveCount(5);

  const firstQuestion = questions.first();
  await expect(firstQuestion.locator('summary')).toContainText('O Vozen Helper já está disponível?');
  await firstQuestion.locator('summary').click();
  await expect(firstQuestion).toHaveAttribute('open', '');
  await expect(firstQuestion.locator('p')).toContainText('O Helper está disponível publicamente');
});

test('the language selector navigates to the matching canonical product route', async ({ page }) => {
  await page.goto('/tts/', { waitUntil: 'networkidle' });
  await page.locator('#langBtn').click();
  await page.locator('[data-lang="fr"]').click();
  await page.waitForURL('**/fr/tts/');
  await expect(page.locator('html')).toHaveAttribute('lang', 'fr');
  await expect(page.locator('h1')).toContainText('Pas de micro ?');
});

test('mobile navigation opens without obscuring the page or losing keyboard focus', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 812 });
  await page.goto('/helper/', { waitUntil: 'networkidle' });
  const burger = page.locator('#burger');
  await burger.focus();
  await page.keyboard.press('Enter');
  await expect(burger).toHaveAttribute('aria-expanded', 'true');
  await expect(page.locator('.nav__links')).toHaveClass(/is-open/);
  await expect(page.locator('.nav__links a', { hasText: 'Vozen TTS' })).toBeVisible();
});

test('Helper FAQ and return link keep 44px mobile touch targets', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 812 });
  await page.goto('/helper/', { waitUntil: 'networkidle' });
  await page.locator('#helper-faq').scrollIntoViewIfNeeded();

  for (const target of await page.locator('#helper-faq summary, .eco-back').all()) {
    const box = await target.boundingBox();
    expect(box, 'touch target should have a layout box').not.toBeNull();
    expect(box.height, 'touch target height').toBeGreaterThanOrEqual(44);
  }
});

test('TTS links to independently hosted Top.gg reviews without republishing identities or quotes', async ({ page }) => {
  await page.goto('/tts/', { waitUntil: 'networkidle' });

  const reviews = page.locator('#reviews');
  await expect(reviews.getByRole('heading', { name: 'Reviews you can verify' })).toBeVisible();
  const link = reviews.getByRole('link', { name: 'Read verified reviews on Top.gg' });
  await expect(link).toHaveAttribute('href', 'https://top.gg/bot/1523826014935842997');
  await expect(reviews.locator('img')).toHaveCount(0);
  await expect(reviews.locator('blockquote')).toHaveCount(0);
});

test('the editorial Portuguese TTS page exposes the same verifiable review source', async ({ page }) => {
  await page.goto('/pt/tts/', { waitUntil: 'networkidle' });

  const reviews = page.locator('#reviews');
  await expect(reviews.getByRole('heading', { name: 'Avaliações que podes verificar' })).toBeVisible();
  const link = reviews.getByRole('link', { name: 'Ler avaliações verificadas no Top.gg' });
  await expect(link).toHaveAttribute('href', 'https://top.gg/bot/1523826014935842997');
  await expect(reviews.locator('img, blockquote')).toHaveCount(0);
});

test('the editorial guides expose complete Portuguese counterparts', async ({ page }) => {
  const guides = [
    ['/pt/guides/discord-without-a-mic/', 'Sem microfone? Continua na conversa do Discord.'],
    ['/pt/guides/vozen-vs-generic-discord-tts/', 'Escolhe o TTS para Discord'],
    ['/pt/guides/helper-moderation-tickets-roles/', 'Começa a organizar o servidor'],
  ];

  for (const [path, heading] of guides) {
    await page.goto(path, { waitUntil: 'networkidle' });
    await expect(page.locator('html')).toHaveAttribute('lang', 'pt-PT');
    await expect(page.locator('h1')).toContainText(heading);
    await expect(page.locator('link[rel="alternate"][hreflang="en"]')).toHaveCount(1);
    await expect(page.locator('link[rel="alternate"][hreflang="pt-PT"]')).toHaveCount(1);
    await expect(page.locator('link[rel="alternate"][hreflang="x-default"]')).toHaveCount(1);
    const overflow = await page.evaluate(() => ({
      viewport: document.documentElement.clientWidth,
      content: document.documentElement.scrollWidth,
    }));
    expect(overflow.content, `${path}: ${JSON.stringify(overflow)}`).toBeLessThanOrEqual(overflow.viewport + 1);
  }
});

test('complete styles are active before interaction and scrolling stays stable', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  for (const path of entryPages) {
    await page.goto(path, { waitUntil: 'networkidle' });
    const completeStyles = path === '/'
      ? page.locator('link[href*="home-full-v1.css"]')
      : page.locator(`link[href*="${path.slice(1, -1)}-page-v1.css"]`);
    await expect(completeStyles).toHaveCount(1);
    for (const stylesheet of await completeStyles.all()) {
      await expect(stylesheet).not.toHaveAttribute('data-deferred-style', '');
      await expect(stylesheet).not.toHaveAttribute('data-progressive-style', '');
      if (path === '/') await expect(stylesheet).toHaveAttribute('media', 'all');
      else await expect(stylesheet).not.toHaveAttribute('media', 'print');
    }
    const pageHeight = await page.evaluate(() => document.documentElement.scrollHeight);
    expect(pageHeight, `${path}: full-page CSS generation height`).toBeLessThanOrEqual(24_000);

    await page.evaluate(() => window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'instant' }));
    const overflow = await page.evaluate(() => ({
      viewport: document.documentElement.clientWidth,
      content: document.documentElement.scrollWidth,
    }));
    expect(overflow.content, `${path}: ${JSON.stringify(overflow)}`).toBeLessThanOrEqual(overflow.viewport + 1);
  }
});
