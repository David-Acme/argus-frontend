import { connected, emit, routes } from './support/harness';
import { expect, openFirst, test } from './support/devices';

const LIVE_MS = 2000;

const presence = (state: 'home' | 'away', since: number) => ({
  people: [{ userId: 1, state, since, environments: [] }],
});

test('who is home changes on the People screen of both devices when a member arrives', async ({ app, browser, screen, second }) => {
  const baseUrl = app.baseUrl ?? '';
  const left = Math.floor(Date.now() / 1000) - 3600;
  await routes(baseUrl, [{ method: 'GET', path: '/guard/presence', info: presence('away', left) }]);
  const escapes = await openFirst(browser, app);
  await second.open();
  await expect.poll(() => connected(baseUrl, 'A'), { timeout: 10000 }).toBe(1);
  await expect.poll(() => connected(baseUrl, 'B'), { timeout: 10000 }).toBe(1);

  await screen.getByRole('tab', 'You').first().click();
  await screen.getByRole('button', 'People').first().click();
  await second.page.getByRole('tab', { name: 'You', exact: true }).first().click();
  await second.page.getByRole('button', { name: 'People', exact: true }).first().click();
  await expect(screen.getByText(/^Away since/).first()).toBeVisible();
  await expect.poll(() => second.page.getByText(/^Away since/).count(), { timeout: 10000 }).toBeGreaterThan(0);

  await routes(baseUrl, [{ method: 'GET', path: '/guard/presence', info: presence('home', Math.floor(Date.now() / 1000)) }]);
  await emit(baseUrl, [
    { frame: { operation: 14, option: 'resource_changed', info: { domain: 'guard', scope: 'presence', ids: [1] } } },
  ]);

  await expect(screen.getByText(/^At home since/).first()).toBeVisible({ timeout: LIVE_MS });
  await expect.poll(() => second.page.getByText(/^At home since/).count(), { timeout: LIVE_MS }).toBeGreaterThan(0);

  expect(escapes).toEqual([]);
  expect(second.escapes).toEqual([]);
});
