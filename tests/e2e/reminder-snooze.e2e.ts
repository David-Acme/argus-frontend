import { connected, routes, store } from './support/harness';
import { expect, openFirst, test } from './support/devices';
import { rowIn } from './support/inicio';

const at = Math.floor(Date.now() / 1000);

const LIVE_MS = 2000;

const HOUR_S = 60 * 60;

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

const rowNamed = (title: string): RegExp => new RegExp(`^${title}, `);

const recorded = async (baseUrl: string): Promise<{ requests: string[]; bodies: Record<string, string> }> =>
  (await (await fetch(new URL('/__e2e/requests', baseUrl))).json()) as { requests: string[]; bodies: Record<string, string> };

test('snoozing an overdue reminder for an hour from its row menu moves it on both devices', async ({ app, browser, screen, second }) => {
  const baseUrl = app.baseUrl ?? '';
  const due = at - 3600;
  await store(baseUrl, 'reminder', reminder(801, 'Take the pills', due));
  await routes(baseUrl, [
    {
      method: 'POST',
      path: '/reminder/801/snooze',
      info: reminder(801, 'Take the pills', at + HOUR_S),
      emits: [auditFrame(11, 801, due, at + HOUR_S)],
    },
  ]);
  const escapes = await openFirst(browser, app);
  await second.open();
  await expect.poll(() => connected(baseUrl, 'A'), { timeout: 10000 }).toBe(1);
  await expect.poll(() => connected(baseUrl, 'B'), { timeout: 10000 }).toBe(1);
  await expect.poll(() => rowIn(second.page, 'Now', 'Take the pills'), { timeout: 10000 }).toContain('Overdue');

  await screen.getByRole('button', rowNamed('Take the pills')).first().secondaryTap();
  await screen.getByRole('menuitem', 'Snooze 1 h').click();

  await expect.poll(async () => (await recorded(baseUrl)).requests, { timeout: LIVE_MS }).toContain(
    'POST /reminder/801/snooze @A'
  );
  expect(JSON.parse((await recorded(baseUrl)).bodies['POST /reminder/801/snooze @A'] ?? '{}')).toEqual({ minutes: 60 });
  await expect.poll(() => rowIn(second.page, 'Now', 'Take the pills'), { timeout: LIVE_MS }).not.toContain('Overdue');
  expect(await rowIn(second.page, 'Now', 'Take the pills')).not.toBe('');
  expect(await second.page.getByRole('checkbox', { name: 'Mark “Take the pills” as done' }).count()).toBeGreaterThan(0);

  expect(escapes).toEqual([]);
  expect(second.escapes).toEqual([]);
});

test('a reminder that is already done offers no snooze in its row menu', async ({ app, browser, screen, second }) => {
  const baseUrl = app.baseUrl ?? '';
  await store(baseUrl, 'reminder', reminder(802, 'Water the fern', at - 1800, true));
  await store(baseUrl, 'reminder', reminder(803, 'Feed the cat', at - 900));
  const escapes = await openFirst(browser, app);
  await second.open();
  await expect.poll(() => connected(baseUrl, 'A'), { timeout: 10000 }).toBe(1);
  await expect.poll(() => rowIn(second.page, 'Today', 'Water the fern'), { timeout: 10000 }).not.toBe('');

  await screen.getByRole('button', rowNamed('Feed the cat')).first().secondaryTap();
  await expect(screen.getByRole('menuitem', 'Snooze 1 h')).toBeVisible();
  await screen.getByRole('menuitem', 'Snooze 1 h').press('Escape');
  await expect(screen.getByRole('menuitem', 'Snooze 1 h')).toBeHidden();

  await screen.getByRole('button', rowNamed('Water the fern')).first().secondaryTap();
  await expect(screen.getByRole('menuitem', 'Edit')).toBeVisible();
  await expect(screen.getByRole('menuitem', 'Snooze 1 h')).toBeHidden();
  await expect(screen.getByRole('menuitem', 'Snooze to tomorrow')).toBeHidden();
  expect(await rowIn(second.page, 'Now', 'Water the fern')).toBe('');

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
  await expect.poll(() => rowIn(second.page, 'Now', 'Call the plumber'), { timeout: 10000 }).toContain('Overdue');

  await screen.getByRole('button', rowNamed('Call the plumber')).first().secondaryTap();
  await screen.getByRole('menuitem', 'Snooze to tomorrow').click();

  await expect.poll(async () => (await recorded(baseUrl)).requests, { timeout: LIVE_MS }).toContain(
    'POST /reminder/804/snooze @A'
  );
  expect(JSON.parse((await recorded(baseUrl)).bodies['POST /reminder/804/snooze @A'] ?? '{}')).toEqual({ tomorrow: true });
  await expect(screen.getByText('Already done', { exact: true })).toBeVisible({ timeout: LIVE_MS });
  await expect(
    screen.getByText('This reminder was already marked done, so there is nothing to snooze.', { exact: true })
  ).toBeVisible();
  await expect(screen.getByText('The reminder could not be snoozed', { exact: true })).toBeHidden();
  expect(await rowIn(second.page, 'Now', 'Call the plumber')).toContain('Overdue');

  expect(escapes).toEqual([]);
  expect(second.escapes).toEqual([]);
});
