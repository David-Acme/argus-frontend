import type { RouteSpec } from './support/fake-argus';
import { connected, emit, routes } from './support/harness';
import { expect, openFirst, test } from './support/devices';

const LIVE_MS = 2000;

type Mode = 'home' | 'away' | 'night' | 'armed';

const environment = (mode: Mode) => ({
  id: 1,
  name: 'Casa',
  kind: 'home',
  isDefault: true,
  mode,
  effectiveMode: mode,
  occupancy: 'manual',
  publicPresent: false,
  staffOnly: false,
  scheduleEnabled: false,
  asleep: '',
  open: '',
  staffed: '',
  closedMode: 'away',
  digestHour: 8,
  quietPolicy: 'inherit',
  quietStartHour: 22,
  quietEndHour: 7,
  cameraIds: [],
  modeUpdatedAt: 1790000000,
  updatedAt: 1790000000,
});

const environmentsChanged = { frame: { operation: 14, option: 'resource_changed', info: { domain: 'guard', scope: 'environments', ids: [1] } } };

const guardRoutes = (mode: Mode): RouteSpec[] => [
  { method: 'GET', path: '/guard/environments', info: [environment(mode)] },
  { method: 'GET', path: '/guard/episodes', info: { rows: [], nextBefore: null } },
  { method: 'GET', path: '/guard/expected-guests', info: [] },
  { method: 'GET', path: '/guard/cameras', info: [] },
];

const episode = (at: number) => ({
  id: 51,
  kind: 'person',
  cameraId: 3,
  cameraName: 'Patio trasero',
  state: 'active',
  stage: 'observing',
  danger: 'medium',
  notified: true,
  notifyCount: 1,
  highestNotified: 'medium',
  subject: 'stranger',
  people: 1,
  reasons: [],
  firstSeen: at,
  lastSeen: at,
  observations: 2,
  groupId: 51,
  reviewLabel: '',
  reviewedAt: 0,
  resolution: '',
  spoke: false,
  sounded: false,
  status: 'open',
  environmentId: 1,
});

test('the guard mode chosen on one device is the mode the other shows, live', async ({ app, browser, screen, second }) => {
  const baseUrl = app.baseUrl ?? '';
  await routes(baseUrl, [
    ...guardRoutes('home'),
    {
      method: 'POST',
      path: '/guard/mode',
      info: [environment('night')],
      sets: [{ method: 'GET', path: '/guard/environments', info: [environment('night')] }],
      emits: [environmentsChanged],
    },
  ]);
  const escapes = await openFirst(browser, app);
  await second.open();
  await expect.poll(() => connected(baseUrl, 'A'), { timeout: 10000 }).toBe(1);
  await expect.poll(() => connected(baseUrl, 'B'), { timeout: 10000 }).toBe(1);

  await second.page.getByRole('tab', { name: 'Security', exact: true }).first().click();
  await expect.poll(() => second.page.getByRole('heading', { name: 'Home', exact: true }).count(), { timeout: 10000 }).toBe(1);

  await screen.getByRole('tab', 'Security').first().click();
  await screen.getByRole('radio', 'Night').click();

  await expect.poll(() => second.page.getByRole('heading', { name: 'Night', exact: true }).count(), { timeout: LIVE_MS }).toBe(1);

  expect(escapes).toEqual([]);
  expect(second.escapes).toEqual([]);
});

test('an episode a camera opens reaches the security screen of both devices, live', async ({ app, browser, screen, second }) => {
  const baseUrl = app.baseUrl ?? '';
  await routes(baseUrl, guardRoutes('away'));
  const escapes = await openFirst(browser, app);
  await second.open();
  await expect.poll(() => connected(baseUrl, 'A'), { timeout: 10000 }).toBe(1);
  await expect.poll(() => connected(baseUrl, 'B'), { timeout: 10000 }).toBe(1);

  await screen.getByRole('tab', 'Security').first().click();
  await second.page.getByRole('tab', { name: 'Security', exact: true }).first().click();
  await expect(screen.getByText('All quiet', { exact: true }).first()).toBeVisible();
  await expect.poll(() => second.page.getByText('All quiet', { exact: true }).count(), { timeout: 10000 }).toBeGreaterThan(0);

  await routes(baseUrl, [
    { method: 'GET', path: '/guard/episodes', info: { rows: [episode(Math.floor(Date.now() / 1000))], nextBefore: null } },
  ]);
  await emit(baseUrl, [
    { frame: { operation: 14, option: 'resource_changed', info: { domain: 'guard', scope: 'episodes', ids: [51] } } },
  ]);

  await expect(screen.getByText(/Patio trasero/).first()).toBeVisible({ timeout: LIVE_MS });
  await expect.poll(() => second.page.getByText(/Patio trasero/).count(), { timeout: LIVE_MS }).toBeGreaterThan(0);

  expect(escapes).toEqual([]);
  expect(second.escapes).toEqual([]);
});
