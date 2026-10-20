import { writeFileSync } from 'node:fs';
import type { CDPSession, Page } from 'playwright-core';
import { connected, emit, store } from './support/harness';
import { expect, test } from './support/devices';

const THREAD_SIZE = 2000;

const SPACING_S = 400;

const CPU_SLOWDOWN = 4;

const PHONE = { width: 412, height: 915 };

const SCROLL_MS = 3000;

const WINDOW_PAGE = 60;

const now = Math.floor(Date.now() / 1000);

const firstAt = now - THREAD_SIZE * SPACING_S;

const bodyOf = (id: number): string => `Message ${String(id).padStart(4, '0')}`;

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

const bubble = (page: Page, id: number) => page.getByLabel(new RegExp(`^${bodyOf(id)}\\. `));

const seedThread = async (baseUrl: string): Promise<void> => {
  for (let id = 1; id <= THREAD_SIZE; id += 1)
    await store(baseUrl, 'conversation_message', row(id, firstAt + id * SPACING_S));
};

const metrics = async (cdp: CDPSession): Promise<Record<string, number>> => {
  await cdp.send('HeapProfiler.collectGarbage');
  const { metrics: list } = (await cdp.send('Performance.getMetrics')) as { metrics: Metric[] };
  return Object.fromEntries(list.map((metric) => [metric.name, metric.value]));
};

const scrollSample = async (page: Page, direction: 1 | -1): Promise<ScrollSample> => {
  const box = page.viewportSize() ?? PHONE;
  await page.mouse.move(box.width / 2, box.height / 2);
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

const renderedMessages = (page: Page): Promise<number> =>
  page.evaluate(() => {
    let count = 0;
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    for (let node = walker.nextNode(); node; node = walker.nextNode())
      if (/^Message \d{4}$/.test(node.textContent ?? '') && node.parentElement?.checkVisibility())
        count += 1;
    return count;
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

test('a 2,000-message thread opens at the newest line, keeps its place while older lines load, and follows new ones', async ({
  app,
  second,
}) => {
  const baseUrl = app.baseUrl ?? '';
  await seedThread(baseUrl);
  const page = second.page;
  await page.setViewportSize(PHONE);
  const cdp = await second.context.newCDPSession(page);
  await cdp.send('Performance.enable');
  await second.open();
  await expect.poll(() => connected(baseUrl, 'B'), { timeout: 15000 }).toBe(1);

  await page.getByRole('button', { name: 'Messages' }).first().click();
  await page.getByText('Argus', { exact: true }).first().waitFor({ timeout: 30000 });
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: CPU_SLOWDOWN });
  const opening = Date.now();
  await page.getByText('Argus', { exact: true }).first().click();
  await bubble(page, THREAD_SIZE).waitFor({ state: 'visible', timeout: 60000 });
  const openMs = Date.now() - opening;
  await page.waitForTimeout(1500);
  const opened = await metrics(cdp);
  const rendered = await renderedMessages(page);
  expect(rendered).toBeLessThan(200);
  expect(await composerInView(page)).toBe(true);

  const windowFirst = THREAD_SIZE - WINDOW_PAGE + 1;
  expect(await bubble(page, windowFirst - 1).count()).toBe(0);
  const reached = await wheelUntilInView(page, windowFirst);
  expect(reached).not.toBeNull();
  const loadedWhileScrolling = (await bubble(page, windowFirst - 1).count()) > 0;
  await expect.poll(() => bubble(page, windowFirst - 1).count(), { timeout: 10000 }).toBe(1);
  await page.waitForTimeout(1000);
  const settled = await inView(page, windowFirst);
  expect(settled).not.toBeNull();
  if (!loadedWhileScrolling) expect(Math.abs((settled ?? 0) - (reached ?? 0))).toBeLessThan(4);
  expect(await composerInView(page)).toBe(true);

  const back = page.getByRole('button', { name: 'Go to the latest' });
  await back.click();
  await expect.poll(() => bubble(page, THREAD_SIZE).isVisible(), { timeout: 10000 }).toBe(true);
  await back.waitFor({ state: 'hidden', timeout: 10000 });

  const up = await scrollSample(page, -1);
  const down = await scrollSample(page, 1);
  const scrolled = await metrics(cdp);
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 });

  const report = {
    cpuSlowdown: CPU_SLOWDOWN,
    viewport: PHONE,
    openMs,
    renderedMessages: rendered,
    domNodes: opened.Nodes,
    jsHeapMb: Math.round(((opened.JSHeapUsedSize ?? 0) / 1048576) * 10) / 10,
    jsHeapAfterScrollMb: Math.round(((scrolled.JSHeapUsedSize ?? 0) / 1048576) * 10) / 10,
    layoutCount: (scrolled.LayoutCount ?? 0) - (opened.LayoutCount ?? 0),
    scriptMsWhileScrolling: Math.round(
      ((scrolled.ScriptDuration ?? 0) - (opened.ScriptDuration ?? 0)) * 1000
    ),
    scrollUp: up,
    scrollDown: down,
  };
  const out = process.env.ARGUS_E2E_PERF_OUT;
  if (out) writeFileSync(out, `${JSON.stringify(report, null, 2)}\n`);

  await scrollSample(page, -1);
  const next = THREAD_SIZE + 1;
  await emit(baseUrl, [
    {
      frame: {
        operation: 4,
        option: 'conversation_message',
        info: { ...row(next, now + 10), direction: 'in', leg: null },
      },
    },
  ]);
  const pill = page.getByRole('button', { name: '1 new message. Go to the latest' });
  await pill.waitFor({ state: 'visible', timeout: 10000 });
  expect(await composerInView(page)).toBe(true);
  await pill.click();
  await expect.poll(() => bubble(page, next).isVisible(), { timeout: 10000 }).toBe(true);
  await pill.waitFor({ state: 'hidden', timeout: 10000 });

  const after = THREAD_SIZE + 2;
  await emit(baseUrl, [
    {
      frame: {
        operation: 4,
        option: 'conversation_message',
        info: { ...row(after, now + 20), direction: 'in', leg: null },
      },
    },
  ]);
  await expect.poll(() => bubble(page, after).isVisible(), { timeout: 10000 }).toBe(true);
  expect(await page.getByRole('button', { name: /new message/ }).count()).toBe(0);
  expect(await composerInView(page)).toBe(true);

  expect(second.escapes).toEqual([]);
});
