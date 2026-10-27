import type { Page } from 'playwright-core';
import { connected, routes, store } from './support/harness';
import { expect, openFirst, test } from './support/devices';

const at = Math.floor(Date.now() / 1000);

const LIVE_MS = 2000;

const visit = {
  id: 700,
  ownerId: 1,
  createdBy: 1,
  projectId: null,
  title: 'Visita al huerto',
  description: '',
  location: '',
  color: 'blue',
  startsAt: at,
  endsAt: null,
  isAllDay: false,
  recurrenceRule: null,
  createdAt: at,
  updatedAt: at,
  deletedAt: null,
};

const luis = {
  id: 2,
  name: 'Luis',
  lastName: 'Paz',
  role: 'resident',
  lang: 'es',
  isActive: true,
  createdAt: at,
  updatedAt: at,
};

const share = {
  id: 88,
  calendarEventId: 700,
  userId: 2,
  access: 'edit',
  createdAt: at + 1,
  updatedAt: at + 1,
  deletedAt: null,
};

const shareRoutes = [
  {
    method: 'POST',
    path: '/calendar-event-share',
    info: share,
    emits: [{ frame: { operation: 4, option: 'calendar_event_share', info: share } }],
  },
  {
    method: 'DELETE',
    path: '/calendar-event-share/88',
    info: { deleted: true, id: 88 },
    emits: [
      {
        frame: {
          operation: 5,
          option: 'calendar_event_share',
          info: { id: 88, deletedAt: at + 2 },
        },
      },
    ],
  },
];

const countButtons = (page: Page, name: string): Promise<number> =>
  page.getByRole('button', { name, exact: true }).count();

test('the owner shares an agenda event, the other device shows the share live, and removing it leaves both', async ({
  app,
  browser,
  screen,
  second,
}) => {
  const baseUrl = app.baseUrl ?? '';
  await store(baseUrl, 'user', luis);
  await store(baseUrl, 'calendar_event', visit);
  await routes(baseUrl, shareRoutes);
  const escapes = await openFirst(browser, app);
  await second.open();
  await expect.poll(() => connected(baseUrl, 'A'), { timeout: 10000 }).toBe(1);
  await expect.poll(() => connected(baseUrl, 'B'), { timeout: 10000 }).toBe(1);

  await screen.getByRole('tab', 'Agenda').first().click();
  await screen.getByRole('button', /^Visita al huerto, /).click();
  await screen.getByRole('button', 'More actions').last().click();
  await screen.getByText('Share', { exact: true }).last().click();
  await expect(screen.getByText('Only you can see this event for now.')).toBeVisible();

  await screen.getByText('Choose a person', { exact: true }).click();
  await screen.getByText('Luis Paz', { exact: true }).last().click();
  await screen.getByText('Can edit', { exact: true }).last().click();
  await screen.getByText('Share the event', { exact: true }).click();

  const requests = async (): Promise<{ requests: string[]; bodies: Record<string, string> }> =>
    (await (await fetch(new URL('/__e2e/requests', baseUrl))).json()) as {
      requests: string[];
      bodies: Record<string, string>;
    };
  await expect
    .poll(async () => (await requests()).requests)
    .toContain('POST /calendar-event-share @A');
  expect(JSON.parse((await requests()).bodies['POST /calendar-event-share @A'] ?? '{}')).toEqual({
    calendarEventId: 700,
    userId: 2,
    access: 'edit',
  });
  await expect(screen.getByRole('button', 'Remove Luis Paz')).toBeVisible({ timeout: LIVE_MS });

  await second.page.getByRole('tab', { name: 'Agenda' }).first().click();
  await second.page.getByRole('button', { name: /^Visita al huerto, / }).click();
  await second.page.getByRole('button', { name: 'More actions', exact: true }).last().click();
  await second.page.getByText('Share', { exact: true }).last().click();
  await expect
    .poll(() => countButtons(second.page, 'Remove Luis Paz'), { timeout: LIVE_MS })
    .toBe(1);

  await screen.getByRole('button', 'Remove Luis Paz').click();
  await screen.getByText('Delete', { exact: true }).last().click();
  await expect(screen.getByRole('button', 'Remove Luis Paz')).toBeHidden({ timeout: LIVE_MS });
  await expect
    .poll(() => countButtons(second.page, 'Remove Luis Paz'), { timeout: LIVE_MS })
    .toBe(0);

  expect(escapes).toEqual([]);
  expect(second.escapes).toEqual([]);
});
