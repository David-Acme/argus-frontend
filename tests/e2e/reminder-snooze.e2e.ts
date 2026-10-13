import type { Page } from 'playwright-core';
import { connected, routes, store } from './support/harness';
import { expect, openFirst, test } from './support/devices';

const at = Math.floor(Date.now() / 1000);

const LIVE_MS = 2000;

const HALF_HOUR_S = 30 * 60;

const reminder = (id: number, title: string, scheduledAt: number, isCompleted = false) => ({
  id,
  createdBy: 1,
  targetUserId: 1,
  title,
  description: '',
  scheduledAt,
  recurrenceRule: null,
  isCompleted,
  completedAt: isCompleted ? at - 60 : null,
  createdAt: at - 7200 + id,
  updatedAt: at - 7200 + id,
});

const auditFrame = (id: number, recordId: number, previous: number, current: number) => ({
  frame: {
    operation: 6,
    option: 'user_audit_log',
    info: {
      id,
      userId: 1,
      recordId,
      tableName: 'reminder',
      changes: { scheduledAt: { previous, current } },
      priority: 1,
      eventTimestamp: (at + 30) * 1000,
      createdAt: at + 30,
    },
  },
});

const rowLabel = async (page: Page, title: string): Promise<string> => {
  const row = page.getByRole('button', { name: new RegExp(`^${title}\\. `) });
  return (await row.count()) === 0 ? '' : ((await row.first().getAttribute('aria-label')) ?? '');
};

const snoozeButtons = (page: Page, title: string): Promise<number> =>
  page.getByRole('button', { name: `Snooze ${title}`, exact: true }).count();

const recorded = async (baseUrl: string): Promise<{ requests: string[]; bodies: Record<string, string> }> =>
  (await (await fetch(new URL('/__e2e/requests', baseUrl))).json()) as { requests: string[]; bodies: Record<string, string> };

test('snoozing an overdue reminder for 30 minutes moves it on both devices', async ({ app, browser, screen, second }) => {
  const baseUrl = app.baseUrl ?? '';
  const due = at - 3600;
  await store(baseUrl, 'reminder', reminder(801, 'Take the pills', due));
  await routes(baseUrl, [
    {
      method: 'POST',
      path: '/reminder/801/snooze',
      info: reminder(801, 'Take the pills', at + HALF_HOUR_S),
      emits: [auditFrame(11, 801, due, at + HALF_HOUR_S)],
    },
  ]);
  const escapes = await openFirst(browser, app);
  await second.open();
  await expect.poll(() => connected(baseUrl, 'A'), { timeout: 10000 }).toBe(1);
  await expect.poll(() => connected(baseUrl, 'B'), { timeout: 10000 }).toBe(1);
  await expect.poll(() => rowLabel(second.page, 'Take the pills'), { timeout: 10000 }).toContain('Overdue');

  await screen.getByRole('button', 'Snooze Take the pills').click();
  await screen.getByText('30 minutes', { exact: true }).last().click();

  await expect.poll(async () => (await recorded(baseUrl)).requests, { timeout: LIVE_MS }).toContain(
    'POST /reminder/801/snooze @A'
  );
  expect(JSON.parse((await recorded(baseUrl)).bodies['POST /reminder/801/snooze @A'] ?? '{}')).toEqual({ minutes: 30 });
  await expect.poll(() => rowLabel(second.page, 'Take the pills'), { timeout: LIVE_MS }).not.toContain('Overdue');
  expect(await second.page.getByRole('checkbox', { name: 'Mark as done' }).count()).toBe(1);

  expect(escapes).toEqual([]);
  expect(second.escapes).toEqual([]);
});

test('a reminder that is already done offers no snooze', async ({ app, browser, screen, second }) => {
  const baseUrl = app.baseUrl ?? '';
  await store(baseUrl, 'reminder', reminder(802, 'Water the fern', at - 1800, true));
  await store(baseUrl, 'reminder', reminder(803, 'Feed the cat', at - 900));
  const escapes = await openFirst(browser, app);
  await second.open();
  await expect.poll(() => connected(baseUrl, 'A'), { timeout: 10000 }).toBe(1);
  await expect.poll(() => snoozeButtons(second.page, 'Feed the cat'), { timeout: 10000 }).toBe(1);

  await screen.getByText('Show the done ones', { exact: true }).click();
  await expect(screen.getByText('Water the fern', { exact: true })).toBeVisible();
  await expect(screen.getByRole('button', 'Snooze Water the fern')).toBeHidden();
  expect(await snoozeButtons(second.page, 'Water the fern')).toBe(0);

  expect(escapes).toEqual([]);
  expect(second.escapes).toEqual([]);
});

test('a snooze answered with 409 because another device completed it says so calmly and moves nothing', async ({
  app,
  browser,
  screen,
  second,
}) => {
  const baseUrl = app.baseUrl ?? '';
  const due = at - 600;
  await store(baseUrl, 'reminder', reminder(804, 'Call the plumber', due));
  await routes(baseUrl, [
    {
      method: 'POST',
      path: '/reminder/804/snooze',
      status: 409,
      errors: { code: 'CONFLICT', message: 'The reminder is already done; it cannot be snoozed' },
    },
  ]);
  const escapes = await openFirst(browser, app);
  await second.open();
  await expect.poll(() => connected(baseUrl, 'A'), { timeout: 10000 }).toBe(1);
  await expect.poll(() => rowLabel(second.page, 'Call the plumber'), { timeout: 10000 }).toContain('Overdue');

  await screen.getByRole('button', 'Snooze Call the plumber').click();
  await screen.getByText('Tomorrow', { exact: true }).last().click();

  await expect.poll(async () => (await recorded(baseUrl)).requests, { timeout: LIVE_MS }).toContain(
    'POST /reminder/804/snooze @A'
  );
  expect(JSON.parse((await recorded(baseUrl)).bodies['POST /reminder/804/snooze @A'] ?? '{}')).toEqual({ tomorrow: true });
  await expect(screen.getByText('Already done', { exact: true })).toBeVisible({ timeout: LIVE_MS });
  await expect(
    screen.getByText('This reminder was already marked done, so there is nothing to snooze.', { exact: true })
  ).toBeVisible();
  await expect(screen.getByText('The reminder could not be snoozed', { exact: true })).toBeHidden();
  expect(await rowLabel(second.page, 'Call the plumber')).toContain('Overdue');

  expect(escapes).toEqual([]);
  expect(second.escapes).toEqual([]);
});
