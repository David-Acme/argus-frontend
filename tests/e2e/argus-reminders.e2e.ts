import type { Page } from 'playwright-core';
import { connected, emit, patchContext, store } from './support/harness';
import { expect, openFirst, test } from './support/devices';

const at = Math.floor(Date.now() / 1000);

const LIVE_MS = 2000;

const laterToday = (): number => {
  const day = new Date();
  day.setHours(Math.min(day.getHours() + 2, 23), 0, 0, 0);
  return Math.floor(day.getTime() / 1000);
};

const reminder = (id: number, title: string, recurrenceRule: string | null) => ({
  id,
  createdBy: 1,
  targetUserId: 1,
  title,
  description: '',
  scheduledAt: laterToday(),
  recurrenceRule,
  isCompleted: false,
  completedAt: null,
  createdAt: at - 3600 + id,
  updatedAt: at - 3600 + id,
});

const pathname = (page: Page): Promise<string> => page.evaluate(() => location.pathname);

const lineCount = (page: Page, title: string): Promise<number> =>
  page.getByRole('button', { name: new RegExp(`^${title},`) }).count();

test('a reminder Argus keeps reaches both devices read-only, with no check and no way to create one', async ({
  app,
  browser,
  screen,
  second,
}) => {
  const baseUrl = app.baseUrl ?? '';
  await patchContext(baseUrl, { timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone });
  await store(baseUrl, 'reminder', reminder(701, 'Water the plants', 'FREQ=WEEKLY'));
  const escapes = await openFirst(browser, app);
  await second.open('/agenda');
  await expect.poll(() => connected(baseUrl, 'A'), { timeout: 10000 }).toBe(1);
  await expect.poll(() => connected(baseUrl, 'B'), { timeout: 10000 }).toBe(1);

  await screen.getByRole('tab', 'Agenda').first().click();
  await expect.poll(() => lineCount(second.page, 'Water the plants'), { timeout: 10000 }).toBe(1);
  expect(
    await second.page.getByRole('checkbox', { name: 'Mark «Water the plants» as done' }).count()
  ).toBe(0);

  await emit(baseUrl, [
    { frame: { operation: 4, option: 'reminder', info: reminder(702, 'Call the plumber', null) } },
  ]);
  await expect
    .poll(() => lineCount(second.page, 'Call the plumber'), { timeout: LIVE_MS * 5 })
    .toBe(1);

  await second.page.getByRole('button', { name: 'New event or task', exact: true }).click();
  expect(await second.page.getByRole('tab', { name: 'Reminder', exact: true }).count()).toBe(0);

  expect(escapes).toEqual([]);
  expect(second.escapes).toEqual([]);
});

test('a tap on a reminder opens the Argus thread with the question as its draft', async ({
  app,
  second,
}) => {
  const baseUrl = app.baseUrl ?? '';
  await store(baseUrl, 'reminder', reminder(703, 'Take the pills', null));
  await second.open('/agenda');
  await expect.poll(() => connected(baseUrl, 'B'), { timeout: 10000 }).toBe(1);
  await expect.poll(() => lineCount(second.page, 'Take the pills'), { timeout: 10000 }).toBe(1);

  await second.page
    .getByRole('button', { name: /^Take the pills,/ })
    .first()
    .click();

  await expect.poll(() => pathname(second.page), { timeout: LIVE_MS }).toBe('/conversations/0');
  await expect
    .poll(() => second.page.getByRole('textbox').first().inputValue(), { timeout: LIVE_MS })
    .toBe('Tell me about the reminder “Take the pills”');

  expect(second.escapes).toEqual([]);
});
