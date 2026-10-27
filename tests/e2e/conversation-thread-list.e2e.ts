import { writeFileSync } from 'node:fs';
import type { CDPSession, Page } from 'playwright-core';
import { connected, emit, storeMany } from './support/harness';
import { expect, test, type SecondDevice } from './support/devices';

const PAGE = 50;

const MAX_PAGES = 4;

const SPACING_S = 90;

const CPU_SLOWDOWN = 4;

const PHONE = { width: 412, height: 915 };

const SCROLL_MS = 3000;

const LOADER = 'Loading earlier messages';

const now = Math.floor(Date.now() / 1000);

const bodyOf = (id: number): string => `Message ${String(id).padStart(5, '0')}`;

const outgoing = (id: number): boolean => id % 7 < 3;

const row = (id: number, createdAt: number) => ({
  id,
  userId: 1,
  counterpartId: 0,
  counterpartName: '',
  direction: outgoing(id) ? 'out' : 'in',
  kind: 'turn',
  body: bodyOf(id),
  leg: outgoing(id) ? 'phone' : null,
  state: 'delivered',
  messageKey: `msg-${id}`,
  replyToKey: null,
  isRead: true,
  readAt: null,
  createdAt,
  updatedAt: null,
  deletedAt: null,
});

type Metric = { name: string; value: number };

type ScrollSample = { frames: number; fps: number; longFrames: number; worstFrameMs: number };

type Opened = { openMs: number; heapMb: number; domNodes: number; mounted: number; contentHeight: number };

const bubble = (page: Page, id: number) => page.getByLabel(new RegExp(`^${bodyOf(id)}\\. `));

const seedThread = (baseUrl: string, size: number): Promise<void> =>
  storeMany(
    baseUrl,
    'conversation_message',
    Array.from({ length: size }, (_, index) => row(index + 1, now - (size - index) * SPACING_S))
  );

const heapMb = (metrics: Record<string, number>): number => Math.round(((metrics.JSHeapUsedSize ?? 0) / 1048576) * 10) / 10;

const metrics = async (cdp: CDPSession): Promise<Record<string, number>> => {
  await cdp.send('HeapProfiler.collectGarbage');
  const { metrics: list } = (await cdp.send('Performance.getMetrics')) as { metrics: Metric[] };
  return Object.fromEntries(list.map((metric) => [metric.name, metric.value]));
};

const scrollerOf = (page: Page) =>
  page.evaluate(() => {
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    for (let node = walker.nextNode(); node; node = walker.nextNode()) {
      if (!/^Message \d{5}$/.test(node.textContent ?? '') || !node.parentElement?.checkVisibility()) continue;
      let scroller: HTMLElement | null = node.parentElement;
      while (scroller && !(scroller.scrollHeight > scroller.clientHeight + 1 && getComputedStyle(scroller).overflowY !== 'visible'))
        scroller = scroller.parentElement;
      if (scroller) return { height: scroller.scrollHeight, top: scroller.scrollTop, client: scroller.clientHeight };
    }
    return null;
  });

const toBottomOfList = (page: Page) =>
  page.evaluate(() => {
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    for (let node = walker.nextNode(); node; node = walker.nextNode()) {
      if (!/^Message \d{5}$/.test(node.textContent ?? '') || !node.parentElement?.checkVisibility()) continue;
      let scroller: HTMLElement | null = node.parentElement;
      while (scroller && !(scroller.scrollHeight > scroller.clientHeight + 1 && getComputedStyle(scroller).overflowY !== 'visible'))
        scroller = scroller.parentElement;
      if (scroller) scroller.scrollTop = scroller.scrollHeight;
      return;
    }
  });

const mountedIds = (page: Page): Promise<number[]> =>
  page.evaluate(() => {
    const ids: number[] = [];
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    for (let node = walker.nextNode(); node; node = walker.nextNode()) {
      const match = /^Message (\d{5})$/.exec(node.textContent ?? '');
      if (match && node.parentElement?.checkVisibility()) ids.push(Number(match[1]));
    }
    return ids;
  });

const inView = async (page: Page, id: number): Promise<number | null> => {
  const target = bubble(page, id);
  if ((await target.count()) === 0) return null;
  const box = await target.boundingBox({ timeout: 2000 });
  if (!box) return null;
  return box.y >= 0 && box.y + box.height <= PHONE.height ? box.y : null;
};

const composerInView = async (page: Page): Promise<boolean> => {
  const box = await page.getByPlaceholder('Write to Argus').boundingBox();
  return box !== null && box.y >= 0 && box.y + box.height <= PHONE.height;
};

const wheelUntilInView = async (page: Page, id: number): Promise<number | null> => {
  await page.mouse.move(PHONE.width / 2, PHONE.height / 2);
  for (let step = 0; step < 300; step += 1) {
    const top = await inView(page, id);
    if (top !== null) return top;
    await page.mouse.wheel(0, -120);
    await page.waitForTimeout(30);
  }
  return null;
};

const scrollSample = async (page: Page, direction: 1 | -1): Promise<ScrollSample> => {
  await page.mouse.move(PHONE.width / 2, PHONE.height / 2);
  const probe = page.evaluate(
    (ms) =>
      new Promise<number[]>((done) => {
        const stamps: number[] = [];
        const start = performance.now();
        const tick = (stamp: number) => {
          stamps.push(stamp);
          if (stamp - start < ms) requestAnimationFrame(tick);
          else done(stamps);
        };
        requestAnimationFrame(tick);
      }),
    SCROLL_MS
  );
  const until = Date.now() + SCROLL_MS;
  while (Date.now() < until) {
    await page.mouse.wheel(0, direction * 240);
    await page.waitForTimeout(16);
  }
  const stamps = await probe;
  const gaps = stamps.slice(1).map((stamp, index) => stamp - (stamps[index] ?? stamp));
  const total = (stamps[stamps.length - 1] ?? 0) - (stamps[0] ?? 0);
  return {
    frames: stamps.length,
    fps: total > 0 ? Math.round(((stamps.length - 1) * 1000) / total) : 0,
    longFrames: gaps.filter((gap) => gap > 50).length,
    worstFrameMs: Math.round(Math.max(0, ...gaps)),
  };
};

const watchLoader = (page: Page): Promise<void> =>
  page.evaluate((label) => {
    const spans: number[] = [];
    let since: number | null = null;
    const check = () => {
      const shown = document.querySelector(`[aria-label="${label}"]`) !== null;
      if (shown && since === null) since = performance.now();
      if (!shown && since !== null) {
        spans.push(performance.now() - since);
        since = null;
      }
    };
    new MutationObserver(check).observe(document.body, { childList: true, subtree: true });
    Object.assign(window, { loaderSpans: spans });
  }, LOADER);

const loaderSpans = (page: Page): Promise<number[]> =>
  page.evaluate(() => [...((window as unknown as { loaderSpans?: number[] }).loaderSpans ?? [])]);

const openThread = async (second: SecondDevice, baseUrl: string, size: number): Promise<{ cdp: CDPSession; opened: Opened }> => {
  await seedThread(baseUrl, size);
  const page = second.page;
  await page.setViewportSize(PHONE);
  const cdp = await second.context.newCDPSession(page);
  await cdp.send('Performance.enable');
  await second.open('/conversations');
  await expect.poll(() => connected(baseUrl, 'B'), { timeout: 15000 }).toBe(1);
  await page.getByText(new RegExp(`${bodyOf(size)}$`)).first().waitFor({ timeout: 60000 });
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: CPU_SLOWDOWN });
  const opening = Date.now();
  await page.getByRole('button', { name: /^Argus\. / }).click();
  await bubble(page, size).waitFor({ state: 'visible', timeout: 60000 });
  const openMs = Date.now() - opening;
  await page.waitForTimeout(1500);
  const values = await metrics(cdp);
  return {
    cdp,
    opened: {
      openMs,
      heapMb: heapMb(values),
      domNodes: values.Nodes ?? 0,
      mounted: (await mountedIds(page)).length,
      contentHeight: (await scrollerOf(page))?.height ?? 0,
    },
  };
};

const report = (size: number, figures: Record<string, unknown>): void => {
  const out = process.env.ARGUS_E2E_PERF_OUT;
  if (out) writeFileSync(`${out}-${size}.json`, `${JSON.stringify({ size, cpuSlowdown: CPU_SLOWDOWN, viewport: PHONE, ...figures }, null, 2)}\n`);
};

test('a 10,000-message thread reads its newest page, loads older pages as it scrolls up, lets far pages go and follows new ones', async ({
  app,
  second,
}) => {
  const size = 10000;
  const baseUrl = app.baseUrl ?? '';
  const page = second.page;
  const { cdp, opened } = await openThread(second, baseUrl, size);

  expect(opened.mounted).toBeLessThan(PAGE);
  expect(opened.contentHeight).toBeLessThan(PAGE * 200);
  expect(await composerInView(page)).toBe(true);

  const windowFirst = size - PAGE + 1;
  expect(await bubble(page, windowFirst - 1).count()).toBe(0);
  await watchLoader(page);
  const reached = await wheelUntilInView(page, windowFirst);
  expect(reached).not.toBeNull();
  await expect.poll(async () => (await scrollerOf(page))?.height ?? 0, { timeout: 10000 }).toBeGreaterThan(opened.contentHeight + PAGE * 40);
  await page.waitForTimeout(1000);
  const settled = await inView(page, windowFirst);
  expect(settled).not.toBeNull();
  await page.mouse.wheel(0, -240);
  await expect.poll(async () => Math.min(...(await mountedIds(page))), { timeout: 10000 }).toBeLessThan(windowFirst);
  expect(await composerInView(page)).toBe(true);

  const up = await scrollSample(page, -1);
  const deeper = await scrollSample(page, -1);
  for (let step = 0; step < 400 && Math.min(...(await mountedIds(page))) >= size - MAX_PAGES * PAGE - PAGE; step += 1) {
    await page.mouse.wheel(0, -240);
    await page.waitForTimeout(20);
  }
  const deep = await metrics(cdp);
  const deepIds = await mountedIds(page);
  const deepHeight = (await scrollerOf(page))?.height ?? 0;
  expect(Math.min(...deepIds)).toBeLessThan(size - MAX_PAGES * PAGE);
  expect(deepHeight).toBeLessThan((MAX_PAGES + 1) * PAGE * 200);
  const next = size + 1;
  await emit(baseUrl, [{ frame: { operation: 4, option: 'conversation_message', info: { ...row(next, now + 10), direction: 'in', leg: null } } }]);
  const pill = page.getByRole('button', { name: '1 new message. Go to the latest' });
  await pill.waitFor({ state: 'visible', timeout: 10000 });
  expect(await composerInView(page)).toBe(true);

  await toBottomOfList(page);
  await page.waitForTimeout(300);
  expect(Math.max(...(await mountedIds(page)))).toBeLessThan(size);

  const down = await scrollSample(page, 1);
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 });
  const spans = await loaderSpans(page);
  const latest = page.getByRole('button', { name: /Go to the latest/ });
  if ((await latest.count()) > 0) await latest.click();
  await expect.poll(() => bubble(page, next).isVisible(), { timeout: 10000 }).toBe(true);
  await latest.waitFor({ state: 'hidden', timeout: 10000 });

  const after = size + 2;
  await emit(baseUrl, [{ frame: { operation: 4, option: 'conversation_message', info: { ...row(after, now + 20), direction: 'in', leg: null } } }]);
  await expect.poll(() => bubble(page, after).isVisible(), { timeout: 10000 }).toBe(true);
  expect(await page.getByRole('button', { name: /new message/ }).count()).toBe(0);
  expect(await composerInView(page)).toBe(true);

  report(size, {
    ...opened,
    deepHeapMb: heapMb(deep),
    deepMounted: deepIds.length,
    deepContentHeight: deepHeight,
    oldestReached: Math.min(...deepIds),
    batches: spans.length,
    batchLoadMs: { max: Math.round(Math.max(0, ...spans)), mean: Math.round(spans.reduce((total, span) => total + span, 0) / Math.max(1, spans.length)) },
    scrollUp: up,
    scrollUpDeeper: deeper,
    scrollDown: down,
  });
  expect(second.escapes).toEqual([]);
});

test('a 100-message thread opens with the same footprint as a 10,000-message one', async ({ app, second }) => {
  const size = 100;
  const { cdp, opened } = await openThread(second, app.baseUrl ?? '', size);
  expect(opened.mounted).toBeLessThan(PAGE);
  expect(await composerInView(second.page)).toBe(true);
  const up = await scrollSample(second.page, -1);
  const scrolled = await metrics(cdp);
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 });
  report(size, { ...opened, deepHeapMb: heapMb(scrolled), scrollUp: up });
  expect(second.escapes).toEqual([]);
});
