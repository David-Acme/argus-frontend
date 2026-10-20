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

const selected = (page: Page, name: string): Promise<boolean[]> =>
  page.evaluate(
    (label) =>
      [...document.querySelectorAll(`[role="radio"][aria-label="${label}"]`)]
        .filter((node) => (node as HTMLElement).checkVisibility())
        .map((node) => node.classList.contains('bg-interactive')),
    name
  );

test('a draft typed to Argus survives a trip to the call and comes back in chat', async ({ app, second }) => {
  const baseUrl = app.baseUrl ?? '';
  const page = second.page;
  await page.addInitScript(silentMicrophone);
  await seedThread(baseUrl, 4);
  await second.open('/conversations/0');
  await expect.poll(() => connected(baseUrl, 'B'), { timeout: 10000 }).toBe(1);

  const field = page.getByPlaceholder('Write to Argus');
  await field.waitFor({ timeout: 10000 });
  await field.fill(DRAFT);

  await page.getByRole('radio', { name: 'Voice' }).click();
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

  await expect.poll(() => selected(page, 'Chat'), { timeout: LIVE_MS }).toEqual([true]);
  await expect
    .poll(() => page.getByPlaceholder('Write to Argus').inputValue({ timeout: 500 }).catch(() => null), { timeout: LIVE_MS })
    .toBe(DRAFT);

  expect(second.escapes).toEqual([]);
});
