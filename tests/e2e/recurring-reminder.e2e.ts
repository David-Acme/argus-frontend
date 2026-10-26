import { connected, patchContext, routes, store } from './support/harness';
import { expect, openFirst, test } from './support/devices';
import { rowIn, UPCOMING, WIDE } from './support/inicio';

const at = Math.floor(Date.now() / 1000);

const LIVE_MS = 2000;

const WEEK_S = 7 * 86_400;

const tomorrowAtEight = (): number => {
  const day = new Date();
  day.setDate(day.getDate() + 1);
  day.setHours(8, 0, 0, 0);
  return Math.floor(day.getTime() / 1000);
};

const reminder = (id: number, title: string, recurrenceRule: string | null, scheduledAt = tomorrowAtEight()) => ({
  id,
  createdBy: 1,
  targetUserId: 1,
  title,
  description: '',
  scheduledAt,
  recurrenceRule,
  isCompleted: false,
  completedAt: null,
  createdAt: at - 3600 + id,
  updatedAt: at - 3600 + id,
});

type Change = { previous: unknown; current: unknown };

const auditFrame = (id: number, recordId: number, changes: Record<string, Change>) => ({
  frame: {
    operation: 6,
    option: 'user_audit_log',
    info: {
      id,
      userId: 1,
      recordId,
      tableName: 'reminder',
      changes,
      priority: 1,
      eventTimestamp: (at + 30) * 1000,
      createdAt: at + 30,
    },
  },
});

const recorded = async (baseUrl: string): Promise<{ requests: string[]; bodies: Record<string, string> }> =>
  (await (await fetch(new URL('/__e2e/requests', baseUrl))).json()) as { requests: string[]; bodies: Record<string, string> };

const bodyOf = async (baseUrl: string, request: string): Promise<unknown> =>
  JSON.parse((await recorded(baseUrl)).bodies[request] ?? '{}');

test('a reminder set to repeat every week on one device shows the repeat on the other', async ({
  app,
  browser,
  screen,
  second,
}) => {
  const baseUrl = app.baseUrl ?? '';
  await patchContext(baseUrl, { timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone });
  await store(baseUrl, 'reminder', reminder(701, 'Water the plants', null));
  await routes(baseUrl, [
    {
      method: 'PATCH',
      path: '/reminder/701',
      info: reminder(701, 'Water the plants', 'FREQ=WEEKLY'),
      emits: [auditFrame(1, 701, { recurrenceRule: { previous: null, current: 'FREQ=WEEKLY' } })],
    },
  ]);
  const escapes = await openFirst(browser, app);
  await second.page.setViewportSize(WIDE);
  await second.open();
  await expect.poll(() => connected(baseUrl, 'A'), { timeout: 10000 }).toBe(1);
  await expect.poll(() => connected(baseUrl, 'B'), { timeout: 10000 }).toBe(1);
  await expect.poll(() => rowIn(second.page, UPCOMING, 'Water the plants'), { timeout: 10000 }).toContain('Tomorrow');
  expect(await rowIn(second.page, 'Tomorrow', 'Water the plants')).not.toBe('');

  await screen.getByText('Water the plants', { exact: true }).click();
  await screen.getByRole('button', 'Repeat: Does not repeat').click();
  await screen.getByText('Every week', { exact: true }).last().click();
  await screen.getByRole('button', 'Save').click();

  await expect.poll(async () => (await recorded(baseUrl)).requests, { timeout: LIVE_MS }).toContain('PATCH /reminder/701 @A');
  expect(await bodyOf(baseUrl, 'PATCH /reminder/701 @A')).toEqual({ recurrenceRule: 'FREQ=WEEKLY' });
  await expect.poll(() => rowIn(second.page, UPCOMING, 'Water the plants'), { timeout: LIVE_MS }).toContain('every week');
  expect(await rowIn(second.page, UPCOMING, 'Water the plants')).toContain('Tomorrow');
  expect(await rowIn(second.page, 'Tomorrow', 'Water the plants')).toContain('every week');

  expect(escapes).toEqual([]);
  expect(second.escapes).toEqual([]);
});

test('completing a weekly reminder moves it a week ahead on both devices and it stays open', async ({
  app,
  browser,
  screen,
  second,
}) => {
  const baseUrl = app.baseUrl ?? '';
  const due = tomorrowAtEight();
  await store(baseUrl, 'reminder', reminder(702, 'Take out the trash', 'FREQ=WEEKLY', due));
  await routes(baseUrl, [
    {
      method: 'PATCH',
      path: '/reminder/702',
      info: reminder(702, 'Take out the trash', 'FREQ=WEEKLY', due + WEEK_S),
      emits: [auditFrame(2, 702, { scheduledAt: { previous: due, current: due + WEEK_S } })],
    },
  ]);
  const escapes = await openFirst(browser, app);
  await second.page.setViewportSize(WIDE);
  await second.open();
  await expect.poll(() => connected(baseUrl, 'A'), { timeout: 10000 }).toBe(1);
  await expect.poll(() => connected(baseUrl, 'B'), { timeout: 10000 }).toBe(1);
  await expect.poll(() => rowIn(second.page, UPCOMING, 'Take out the trash'), { timeout: 10000 }).toContain('every week');
  const before = await rowIn(second.page, UPCOMING, 'Take out the trash');
  expect(before).toContain('Tomorrow');

  await screen.getByRole('checkbox', 'Mark “Take out the trash” as done').click();

  await expect.poll(async () => (await recorded(baseUrl)).requests, { timeout: LIVE_MS }).toContain('PATCH /reminder/702 @A');
  expect(await bodyOf(baseUrl, 'PATCH /reminder/702 @A')).toEqual({ isCompleted: true });
  await expect.poll(() => rowIn(second.page, UPCOMING, 'Take out the trash'), { timeout: LIVE_MS }).not.toBe(before);
  const after = await rowIn(second.page, UPCOMING, 'Take out the trash');
  expect(after).toContain('every week');
  expect(after).not.toContain('Tomorrow');
  expect(await rowIn(second.page, 'Tomorrow', 'Take out the trash')).toBe('');

  expect(escapes).toEqual([]);
  expect(second.escapes).toEqual([]);
});

test('stopping the repeat from the reminder keeps the time on both devices', async ({ app, browser, screen, second }) => {
  const baseUrl = app.baseUrl ?? '';
  await store(baseUrl, 'reminder', reminder(703, 'Call grandma', 'FREQ=DAILY'));
  await routes(baseUrl, [
    {
      method: 'PATCH',
      path: '/reminder/703',
      info: reminder(703, 'Call grandma', null),
      emits: [auditFrame(3, 703, { recurrenceRule: { previous: 'FREQ=DAILY', current: null } })],
    },
  ]);
  const escapes = await openFirst(browser, app);
  await second.page.setViewportSize(WIDE);
  await second.open();
  await expect.poll(() => connected(baseUrl, 'A'), { timeout: 10000 }).toBe(1);
  await expect.poll(() => connected(baseUrl, 'B'), { timeout: 10000 }).toBe(1);
  await expect.poll(() => rowIn(second.page, UPCOMING, 'Call grandma'), { timeout: 10000 }).toContain('every day');

  await screen.getByText('Call grandma', { exact: true }).click();
  await screen.getByText('Stop repeating', { exact: true }).last().click();
  await screen.getByRole('button', 'Save').click();

  await expect.poll(async () => (await recorded(baseUrl)).requests, { timeout: LIVE_MS }).toContain('PATCH /reminder/703 @A');
  expect(await bodyOf(baseUrl, 'PATCH /reminder/703 @A')).toEqual({ recurrenceRule: null });
  await expect.poll(() => rowIn(second.page, UPCOMING, 'Call grandma'), { timeout: LIVE_MS }).not.toContain('every day');
  expect(await rowIn(second.page, UPCOMING, 'Call grandma')).toContain('Tomorrow');

  expect(escapes).toEqual([]);
  expect(second.escapes).toEqual([]);
});
