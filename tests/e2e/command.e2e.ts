import type { Page } from 'playwright-core';
import { connected, store } from './support/harness';
import { expect, test } from './support/devices';

const at = Math.floor(Date.now() / 1000);

const LIVE_MS = 5000;

const PALETTE = 'Search or ask Argus';

const reminder = {
  id: 901,
  createdBy: 1,
  targetUserId: 1,
  title: 'Pay the light bill',
  description: '',
  scheduledAt: at + 3600,
  recurrenceRule: null,
  isCompleted: false,
  completedAt: null,
  createdAt: at - 60,
  updatedAt: at - 60,
};

const lesson = {
  id: 902,
  ownerId: 1,
  createdBy: 1,
  projectId: null,
  title: 'Guitar lesson',
  description: '',
  location: '',
  color: 'blue',
  startsAt: at + 2 * 86400,
  endsAt: null,
  isAllDay: false,
  recurrenceRule: null,
  createdAt: at - 30,
  updatedAt: at - 30,
  deletedAt: null,
};

const palettes = (page: Page): Promise<number> =>
  page.getByRole('dialog', { name: PALETTE }).count();

const groupNames = (page: Page): Promise<(string | null)[]> =>
  page
    .getByRole('dialog', { name: PALETTE })
    .getByRole('group')
    .evaluateAll((nodes) => nodes.map((node) => node.getAttribute('aria-label')));

const query = (page: Page) => page.getByRole('combobox', { name: PALETTE });

const optionCount = (page: Page, name: string): Promise<number> =>
  page.getByRole('option', { name, exact: true }).count();

const pathname = (page: Page): Promise<string> => page.evaluate(() => location.pathname);

const opens = async (page: Page, key: string): Promise<void> => {
  await expect
    .poll(
      async () => {
        if ((await palettes(page)) === 0) await page.keyboard.press(key);
        return palettes(page);
      },
      { timeout: 15000 }
    )
    .toBe(1);
};

const searchFor = async (page: Page, text: string, expected: string): Promise<void> => {
  await expect
    .poll(
      async () => {
        if ((await palettes(page)) === 0) await page.keyboard.press('Control+k');
        await query(page).fill(text);
        return optionCount(page, expected);
      },
      { timeout: 15000 }
    )
    .toBe(1);
};

test('Ctrl+K opens the palette, typing filters local data, and Esc and an outside click close it', async ({
  app,
  second,
}) => {
  const baseUrl = app.baseUrl ?? '';
  const page = second.page;
  await store(baseUrl, 'reminder', reminder);
  await store(baseUrl, 'calendar_event', lesson);
  await second.open('/');
  await expect.poll(() => connected(baseUrl, 'B'), { timeout: 10000 }).toBe(1);

  await opens(page, 'Control+k');
  expect(await groupNames(page)).toEqual(['Actions', 'Go to']);

  await searchFor(page, 'pay', 'Pay the light bill');
  expect(await groupNames(page)).toEqual(['Ask Argus', 'Agenda', 'Actions']);
  expect(await optionCount(page, 'Ask Argus to remind me “pay…”')).toBe(1);

  await searchFor(page, 'guitar', 'Guitar lesson');
  expect(await optionCount(page, 'Pay the light bill')).toBe(0);

  await page.keyboard.press('Escape');
  await expect.poll(() => palettes(page), { timeout: LIVE_MS }).toBe(0);

  await opens(page, '/');
  await page.mouse.click(40, 760);
  await expect.poll(() => palettes(page), { timeout: LIVE_MS }).toBe(0);

  expect(second.escapes).toEqual([]);
});

test('Enter on free text sends it to Argus and opens the thread', async ({ app, second }) => {
  const baseUrl = app.baseUrl ?? '';
  const page = second.page;
  await second.open('/');
  await expect.poll(() => connected(baseUrl, 'B'), { timeout: 10000 }).toBe(1);

  await opens(page, 'Control+k');
  await query(page).fill('what is on today');
  expect(await optionCount(page, '“what is on today…” — ask Argus')).toBe(1);
  await page.keyboard.press('Enter');

  await expect.poll(() => pathname(page), { timeout: LIVE_MS }).toBe('/conversations/0');
  await expect.poll(() => palettes(page), { timeout: LIVE_MS }).toBe(0);
  await expect
    .poll(() => page.getByText('what is on today', { exact: true }).count(), { timeout: LIVE_MS })
    .toBeGreaterThan(0);

  expect(second.escapes).toEqual([]);
});

test('N opens only the new-item actions, and New event opens the event form', async ({
  app,
  second,
}) => {
  const baseUrl = app.baseUrl ?? '';
  const page = second.page;
  await second.open('/');
  await expect.poll(() => connected(baseUrl, 'B'), { timeout: 10000 }).toBe(1);

  await opens(page, 'n');
  expect(await groupNames(page)).toEqual(['Actions']);
  expect(await optionCount(page, 'New event')).toBe(1);
  await query(page).fill('event');
  await page.keyboard.press('Enter');

  await expect.poll(() => pathname(page), { timeout: LIVE_MS }).toBe('/agenda');
  await expect
    .poll(() => page.getByRole('dialog', { name: 'New event' }).count(), { timeout: LIVE_MS })
    .toBe(1);

  expect(second.escapes).toEqual([]);
});
