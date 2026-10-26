import { connected, routes, store } from './support/harness';
import { expect, openFirst, test } from './support/devices';

const at = Math.floor(Date.now() / 1000);

const LIVE_MS = 2000;

const UNDO_MS = 6000;

const OUTLAST_TIMER_MS = 8000;

const visit = {
  id: 700,
  ownerId: 1,
  createdBy: 1,
  projectId: null,
  title: 'Prueba R3 sin red',
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

const requests = async (baseUrl: string): Promise<string[]> =>
  ((await (await fetch(new URL('/__e2e/requests', baseUrl))).json()) as { requests: string[] }).requests;

test('a refused event delete says it was not deleted, and its reopened alert stays until dismissed', async ({
  app,
  browser,
  screen,
}) => {
  const baseUrl = app.baseUrl ?? '';
  await store(baseUrl, 'calendar_event', visit);
  await routes(baseUrl, [
    {
      method: 'DELETE',
      path: '/calendar-event/700',
      status: 503,
      errors: { code: 'SERVICE_UNAVAILABLE', message: 'Argus is not available' },
    },
  ]);
  const escapes = await openFirst(browser, app);
  await expect.poll(() => connected(baseUrl, 'A'), { timeout: 10000 }).toBe(1);

  await screen.getByRole('tab', 'Agenda').first().click();
  await screen.getByRole('button', 'Options').first().click();
  await screen.getByText('Delete', { exact: true }).last().click();

  await expect.poll(() => requests(baseUrl), { timeout: UNDO_MS + LIVE_MS }).toContain('DELETE /calendar-event/700 @A');
  await expect(screen.getByText('The event was not deleted', { exact: true })).toBeVisible({ timeout: LIVE_MS });
  await expect(screen.getByText('The event was not saved', { exact: true })).toBeHidden();

  const parkedDot = screen.getByRole('button', 'The event was not deleted');
  await expect(parkedDot).toBeVisible({ timeout: UNDO_MS + LIVE_MS });
  await parkedDot.click();
  await expect(parkedDot).toBeHidden({ timeout: LIVE_MS });
  await expect(screen.getByText('The event was not deleted', { exact: true }).first()).toBeVisible({ timeout: LIVE_MS });
  await browser.evaluate((ms) => new Promise<null>((resolve) => setTimeout(() => resolve(null), ms)), OUTLAST_TIMER_MS);
  await expect(screen.getByText('The event was not deleted', { exact: true }).first()).toBeVisible();
  await expect(screen.getByText('Retry', { exact: true })).toBeVisible();

  expect(escapes).toEqual([]);
});
