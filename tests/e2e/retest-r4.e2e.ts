import type { Page } from 'playwright-core';
import { connected, storeMany } from './support/harness';
import { expect, test } from './support/devices';

const LIVE_MS = 3000;

const DRAFT = 'borrador de prueba';

const now = Math.floor(Date.now() / 1000);

const row = (id: number) => ({
  id,
  userId: 1,
  counterpartId: 0,
  counterpartName: '',
  direction: id % 2 === 0 ? 'out' : 'in',
  kind: 'turn',
  body: `Line ${String(id).padStart(3, '0')}`,
  leg: id % 2 === 0 ? 'laptop' : null,
  state: 'delivered',
  messageKey: `r4-${id}`,
  replyToKey: null,
  isRead: true,
  readAt: null,
  createdAt: now - (60 - id) * 90,
  updatedAt: null,
  deletedAt: null,
});

const seedThread = (baseUrl: string, size: number): Promise<void> =>
  storeMany(
    baseUrl,
    'conversation_message',
    Array.from({ length: size }, (_, index) => row(index + 1))
  );

const silentMicrophone = (): void => {
  navigator.mediaDevices.getUserMedia = () => {
    const audio = new AudioContext();
    return Promise.resolve(audio.createMediaStreamDestination().stream);
  };
};

const composerOf = (page: Page) =>
  page.evaluate(() => {
    const field = document.querySelector('textarea[placeholder="Write to Argus"]');
    let node = field?.parentElement ?? null;
    while (node && getComputedStyle(node).backgroundColor === 'rgba(0, 0, 0, 0)') node = node.parentElement;
    const box = node?.getBoundingClientRect();
    if (!node || !box) return null;
    return { holdsRows: (node.textContent ?? '').includes('Line 0'), top: box.top };
  });

test('a draft typed to Argus survives a trip to the call and comes back in the thread', async ({ app, second }) => {
  const baseUrl = app.baseUrl ?? '';
  const page = second.page;
  await page.addInitScript(silentMicrophone);
  await seedThread(baseUrl, 4);
  await second.open('/conversations/0');
  await expect.poll(() => connected(baseUrl, 'B'), { timeout: 10000 }).toBe(1);

  const field = page.getByPlaceholder('Write to Argus');
  await field.waitFor({ timeout: 10000 });
  await field.fill(DRAFT);

  await page.getByRole('button', { name: 'Call Argus' }).click();
  await expect.poll(() => page.evaluate(() => location.pathname), { timeout: LIVE_MS }).toBe('/call');

  const toChat = page.getByRole('button', { name: 'Chat' }).first();
  await expect
    .poll(
      async () => {
        await toChat.click({ timeout: 1000 }).catch(() => undefined);
        return page.evaluate(() => location.pathname);
      },
      { timeout: 15000 }
    )
    .toBe('/conversations/0');

  await expect
    .poll(() => page.getByPlaceholder('Write to Argus').inputValue({ timeout: 500 }).catch(() => null), { timeout: LIVE_MS })
    .toBe(DRAFT);

  expect(second.escapes).toEqual([]);
});

test('read away from the bottom, the composer hides the rows behind it and the latest arrow floats above it', async ({
  app,
  second,
}) => {
  const baseUrl = app.baseUrl ?? '';
  const page = second.page;
  await seedThread(baseUrl, 60);
  await second.open('/conversations/0');
  await expect.poll(() => connected(baseUrl, 'B'), { timeout: 10000 }).toBe(1);

  await page.getByText('Line 060', { exact: true }).waitFor({ timeout: 10000 });
  const arrow = page.getByRole('button', { name: 'Go to the latest' });
  await page.mouse.move(640, 300);
  for (let step = 0; step < 20 && !(await arrow.isVisible()); step += 1) {
    await page.mouse.wheel(0, -400);
    await page.waitForTimeout(100);
  }
  expect(await arrow.isVisible()).toBe(true);

  const composer = await composerOf(page);
  expect(composer).not.toBeNull();
  expect(composer?.holdsRows).toBe(false);
  const box = await arrow.boundingBox();
  expect(box).not.toBeNull();
  expect((box?.y ?? 0) + (box?.height ?? 0)).toBeLessThanOrEqual(composer?.top ?? 0);

  expect(second.escapes).toEqual([]);
});
