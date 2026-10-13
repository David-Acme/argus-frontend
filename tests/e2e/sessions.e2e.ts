import type { RouteSpec } from './support/fake-argus';
import { connected, routes } from './support/harness';
import { expect, openFirst, test } from './support/devices';

const LIVE_MS = 2000;
const SESSION_A = 'a'.repeat(32);
const SESSION_B = 'b'.repeat(32);

const session = (id: string, deviceName: string, platform: string, current: boolean) => ({
  id,
  platform,
  deviceName,
  createdAt: 1790000000,
  lastSeenAt: 1790000100,
  expiresAt: 1890000000,
  current,
});

const desktop = (current: boolean) => session(SESSION_A, 'Escritorio', 'desktop', current);
const phone = (current: boolean) => session(SESSION_B, 'Teléfono de Ana', 'android', current);

const sessionRoutes: RouteSpec[] = [
  { method: 'GET', path: '/auth/sessions', device: 'A', info: { sessions: [desktop(true), phone(false)] } },
  { method: 'GET', path: '/auth/sessions', device: 'B', info: { sessions: [desktop(false), phone(true)] } },
  {
    method: 'DELETE',
    path: `/auth/sessions/${SESSION_B}`,
    info: { revoked: [SESSION_B], current: false },
    sets: [{ method: 'GET', path: '/auth/sessions', device: 'A', info: { sessions: [desktop(true)] } }],
    emits: [
      {
        device: 'B',
        frame: { operation: 7, option: 'user', info: { reason: 'sessionRevoked', sessionId: SESSION_B, cause: 'revokedByOwner' } },
        close: true,
      },
      { device: 'A', frame: { operation: 7, option: 'user', info: { reason: 'sessionsChanged' } } },
    ],
  },
];

test('a session closed on one device ends the other at once, and the list that closed it updates', async ({
  app,
  browser,
  screen,
  second,
}) => {
  const baseUrl = app.baseUrl ?? '';
  await routes(baseUrl, sessionRoutes);
  const escapes = await openFirst(browser, app);
  await second.open();
  await expect.poll(() => connected(baseUrl, 'A'), { timeout: 10000 }).toBe(1);
  await expect.poll(() => connected(baseUrl, 'B'), { timeout: 10000 }).toBe(1);
  await expect.poll(() => second.page.getByRole('heading', { name: 'Welcome, Ana' }).count(), { timeout: 10000 }).toBe(1);

  await screen.getByRole('button', 'Profile').first().click();
  await expect(screen.getByRole('button', 'Sign out of Teléfono de Ana')).toBeVisible();
  await screen.getByRole('button', 'Sign out of Teléfono de Ana').click();

  await expect(screen.getByRole('button', 'Sign out of Teléfono de Ana')).toBeHidden({ timeout: LIVE_MS });
  await expect.poll(() => second.page.getByRole('heading', { name: 'Welcome, Ana' }).count(), { timeout: LIVE_MS }).toBe(0);
  await expect.poll(() => second.page.evaluate(() => window.localStorage.getItem('argus-storage:app.session.user'))).toBeNull();
  await expect.poll(() => connected(baseUrl, 'B')).toBe(0);

  expect(escapes).toEqual([]);
  expect(second.escapes).toEqual([]);
});
