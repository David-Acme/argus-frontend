import type { RouteSpec } from './support/fake-argus';
import { connected, patchContext, routes, store } from './support/harness';
import { expect, openFirst, test } from './support/devices';

const at = Math.floor(Date.now() / 1000);

const LIVE_MS = 2000;

const UNDO_MS = 6000;

const OUTLAST_TIMER_MS = 8000;

const text = (es: string, en: string) => ({ es, en });

const detailed = (id: string, name: { es: string; en: string }, kind: string, gettingStarted: unknown[]) => ({
  id,
  name,
  summary: text('', ''),
  kind,
  intro: null,
  roles: [],
  lifecycle: 'active',
  enabled: true,
  hasData: false,
  dataPurgedAt: null,
  requires: [],
  sizeBytes: 1000,
  installedBytes: 1000,
  hardware: null,
  job: null,
  gettingStarted,
  components: [],
});

const catalog = [
  detailed('core', text('Asistente y hogar', 'Assistant and home'), 'core', []),
  detailed('surveillance', text('Vigilancia', 'Surveillance'), 'available', [
    { id: 'guard-mode', title: 'Choose the guard mode', route: '/guard' },
  ]),
];

const environment = (modeUpdatedAt: number) => ({
  id: 1,
  name: 'Casa',
  kind: 'home',
  isDefault: true,
  mode: 'home',
  effectiveMode: 'home',
  occupancy: 'manual',
  publicPresent: false,
  staffOnly: false,
  scheduleEnabled: false,
  asleep: '',
  open: '',
  staffed: '',
  closedMode: 'away',
  digestHour: 20,
  quietPolicy: 'inherit',
  quietStartHour: 22,
  quietEndHour: 7,
  cameraIds: [],
  maskedCameras: [],
  modeUpdatedAt,
  updatedAt: at,
});

const environments = (modeUpdatedAt: number): RouteSpec => ({
  method: 'GET',
  path: '/guard/environments',
  info: [environment(modeUpdatedAt)],
});

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

test('the guard-mode step opens the security screen and ticks only once a mode was chosen', async ({
  app,
  browser,
  screen,
}) => {
  const baseUrl = app.baseUrl ?? '';
  await patchContext(baseUrl, { ownerCatalog: catalog });
  await routes(baseUrl, [environments(0)]);
  const escapes = await openFirst(browser, app);
  await expect.poll(() => connected(baseUrl, 'A'), { timeout: 10000 }).toBe(1);

  const step = screen.getByRole('button', 'Choose the guard mode');
  await expect(step).toBeVisible({ timeout: 10000 });
  await step.click();
  await expect.poll(() => browser.evaluate(() => location.pathname), { timeout: LIVE_MS }).toBe('/security');
  await expect(screen.getByText('Page not found', { exact: true })).toBeHidden();

  await app.open('/');
  await expect(screen.getByText('Getting started', { exact: true })).toBeVisible({ timeout: 10000 });
  await expect(screen.getByText('0 of 1', { exact: true })).toBeVisible();

  await routes(baseUrl, [environments(at)]);
  await step.click();
  await expect.poll(() => browser.evaluate(() => location.pathname), { timeout: LIVE_MS }).toBe('/security');
  await app.open('/');
  await expect(screen.getByText('Getting started', { exact: true })).toBeHidden({ timeout: 10000 });

  expect(escapes).toEqual([]);
});

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

  await screen.getByRole('button', 'Schedule').first().click();
  await screen.getByRole('button', 'Options').first().click();
  await screen.getByText('Delete', { exact: true }).last().click();

  await expect.poll(() => requests(baseUrl), { timeout: UNDO_MS + LIVE_MS }).toContain('DELETE /calendar-event/700 @A');
  await expect(screen.getByText('The event was not deleted', { exact: true })).toBeVisible({ timeout: LIVE_MS });
  await expect(screen.getByText('The event was not saved', { exact: true })).toBeHidden();

  const parkedDot = screen.getByRole('button', 'The event was not deleted');
  await expect(parkedDot).toBeVisible({ timeout: UNDO_MS + LIVE_MS });
  await parkedDot.click();
  await expect(screen.getByText('The event was not deleted', { exact: true })).toBeVisible({ timeout: LIVE_MS });
  await browser.evaluate((ms) => new Promise<null>((resolve) => setTimeout(() => resolve(null), ms)), OUTLAST_TIMER_MS);
  await expect(screen.getByText('The event was not deleted', { exact: true })).toBeVisible();
  await expect(screen.getByText('Retry', { exact: true })).toBeVisible();

  expect(escapes).toEqual([]);
});
