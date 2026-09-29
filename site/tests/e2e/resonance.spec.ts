import { expect, test, type Page } from '@playwright/test';
import type { ResonancePayload } from '../../src/lib/resonance';

// Test the production build in a browser, with only the function boundary mocked.
// Block every off-site request so no test can write to GitHub or production.
test.beforeEach(async ({ page }) => {
  await page.route('**/*', async route => {
    if (new URL(route.request().url()).origin !== 'http://127.0.0.1:4322') {
      await route.abort();
      return;
    }
    await route.continue();
  });
});

async function mockFunctions(page: Page, options: { status?: number; failWrites?: number; lag?: boolean } = {}) {
  const writes: ResonancePayload[] = [];
  let writeAttempts = 0;
  let reads = 0;
  await page.route('**/.netlify/functions/get-resonance?*', async route => {
    reads++;
    const fp = new URL(route.request().url()).searchParams.get('fp');
    await route.fulfill({ json: {
      module: 'attention-as-lever',
      passages: options.lag ? [] : writes.map(p => ({
        passage_id: p.passage_id, othersCount: fp === p.user_fingerprint ? 0 : 1,
        youResonated: fp === p.user_fingerprint, selector: p.selector,
      })),
    } });
  });
  await page.route('**/.netlify/functions/record-resonance', async route => {
    writeAttempts++;
    const shouldFail = options.failWrites !== undefined && writeAttempts <= options.failWrites;
    const status = shouldFail ? (options.status ?? 500) : (options.failWrites !== undefined ? 200 : (options.status ?? 200));
    if (status === 200) writes.push(route.request().postDataJSON());
    await route.fulfill({ status, json: { status: status === 200 ? 'success' : 'error' } });
  });
  return { writes, attempts: () => writeAttempts, reads: () => reads };
}

async function openModule(page: Page) {
  await page.goto('/modules/attention-as-lever');
  await expect(page.locator('astro-island[component-export="default"]:not([ssr])').first()).toBeVisible();
}

async function selectPassage(page: Page) {
  const paragraph = page.locator('article astro-island p').filter({ hasNot: page.locator('a') }).first();
  await paragraph.scrollIntoViewIfNeeded();
  const exact = await paragraph.evaluate(element => {
    const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
    let text: Text | null;
    while ((text = walker.nextNode() as Text | null)) {
      if (text.length < 20) continue;
      const range = document.createRange();
      range.setStart(text, 0);
      range.setEnd(text, Math.min(40, text.length));
      const selection = window.getSelection()!;
      selection.removeAllRanges();
      selection.addRange(range);
      return range.toString().trim();
    }
    throw new Error('No selectable paragraph text');
  });
  await expect(page.getByRole('button', { name: 'Mark this text as resonating with you' })).toBeVisible();
  return exact;
}

async function highlightedTexts(page: Page) {
  return page.evaluate(() => {
    if ('highlights' in CSS) {
      return [...CSS.highlights.values()].flatMap(highlight => [...highlight].map(range => range.toString()));
    }
    return [...document.querySelectorAll('mark[data-others-count]')].map(mark => mark.textContent);
  });
}

async function hoverHighlight(page: Page) {
  const point = await page.evaluate(() => {
    const range = 'highlights' in CSS ? [...CSS.highlights.values()].flatMap(h => [...h])[0] : null;
    const rect = range ? (range as Range).getClientRects()[0]
      : document.querySelector('mark[data-others-count]')!.getClientRects()[0];
    return { x: rect.left + Math.min(10, rect.width / 2), y: rect.top + rect.height / 2 };
  });
  await page.mouse.move(point.x, point.y);
}

test('selection saves, highlights immediately despite read lag, and persists ownership', async ({ page }) => {
  const api = await mockFunctions(page, { lag: true });
  await openModule(page);
  await expect.poll(api.reads).toBe(1);
  const exact = await selectPassage(page);
  await page.getByRole('button', { name: 'Mark this text as resonating with you' }).click();
  await expect.poll(() => api.writes.length).toBe(1);
  expect(api.writes[0]).toMatchObject({ module: 'attention-as-lever', selector: { exact, type: 'TextQuoteSelector' } });
  await expect.poll(() => highlightedTexts(page)).toContain(exact);
  await expect.poll(api.reads).toBe(2); // The empty refetch must not erase the new highlight.
  await expect(page.getByRole('dialog', { name: 'Resonance feedback' })).toBeHidden();
  await hoverHighlight(page);
  await expect(page.getByRole('tooltip')).toContainText('You resonated with this');
  const p = api.writes[0];
  expect(await page.evaluate(fp => JSON.parse(localStorage.getItem(`onbalance-resonated:${fp}`)!), p.user_fingerprint))
    .toContain(p.passage_id);
});

test('saved highlight and personal tooltip return after reload', async ({ page }) => {
  const api = await mockFunctions(page);
  await openModule(page);
  const exact = await selectPassage(page);
  await page.getByRole('button', { name: 'Mark this text as resonating with you' }).click();
  await expect.poll(() => api.writes.length).toBe(1);
  await expect.poll(() => highlightedTexts(page)).toContain(exact);
  await page.reload();
  await expect.poll(() => highlightedTexts(page)).toContain(exact);
  await page.locator('article astro-island p').first().scrollIntoViewIfNeeded();
  await hoverHighlight(page);
  await expect(page.getByRole('tooltip')).toContainText('You resonated with this');
});

test('transient failures allow retry without recording ownership or glow', async ({ page }) => {
  const api = await mockFunctions(page, { status: 429, failWrites: 1 });
  await openModule(page);
  const exact = await selectPassage(page);
  const button = page.getByRole('button', { name: 'Mark this text as resonating with you' });

  await button.click();
  await expect(button.filter({ hasText: 'Error — try again' })).toBeEnabled();
  await expect(button).toHaveText('👍 Resonates');
  expect(api.attempts()).toBe(1);
  expect(api.writes).toHaveLength(0);
  expect(await highlightedTexts(page)).toEqual([]);
  expect(await page.evaluate(() => Object.keys(localStorage).filter(k => k.startsWith('onbalance-resonated:')))).toEqual([]);

  await button.click();
  await expect.poll(() => api.writes.length).toBe(1);
  await expect.poll(() => highlightedTexts(page)).toContain(exact);
  await expect(page.getByRole('dialog', { name: 'Resonance feedback' })).toBeHidden();
});

test('terminal failures disable submission and Escape dismisses the popup', async ({ page }) => {
  await mockFunctions(page, { status: 503 });
  await openModule(page);
  await selectPassage(page);
  await page.getByRole('button', { name: 'Mark this text as resonating with you' }).click();
  await expect(page.getByRole('button', { name: 'Mark this text as resonating with you' }).filter({ hasText: "Couldn't save" })).toBeDisabled();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog', { name: 'Resonance feedback' })).toBeHidden();
  expect(await highlightedTexts(page)).toEqual([]);
});
