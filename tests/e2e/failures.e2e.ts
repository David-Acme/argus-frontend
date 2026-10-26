import { connected, control, routes, store } from './support/harness';
import { expect, openFirst, test } from './support/devices';

const at = Math.floor(Date.now() / 1000);

const luis = { id: 2, name: 'Luis', lastName: 'Paz', role: 'resident', lang: 'es', isActive: true, createdAt: at, updatedAt: at };

const failing = (path: string) => ({
  method: 'GET',
  path,
  status: 500,
  errors: { code: 'INTERNAL_ERROR', message: 'x' },
});

test('members do not read "No open sessions" when the sessions overview failed to load', async ({ app, browser, screen }) => {
  const baseUrl = app.baseUrl ?? '';
  await store(baseUrl, 'user', luis);
  await routes(baseUrl, [failing('/auth/users/sessions')]);
  const escapes = await openFirst(browser, app);
  await expect.poll(() => connected(baseUrl, 'A'), { timeout: 10000 }).toBe(1);

  await screen.getByRole('tab', 'You').first().click();
  await screen.getByRole('button', 'People').first().click();
  await expect(screen.getByText(/Luis Paz/).first()).toBeVisible({ timeout: 10000 });
  await expect(screen.getByText('The connected devices could not be loaded.', { exact: true })).toBeVisible({ timeout: 10000 });
  expect(await browser.evaluate(() => document.body.innerText.includes('No open sessions'))).toBe(false);

  expect(escapes).toEqual([]);
});

test('an empty sessions answer ends the search instead of searching forever', async ({ app, browser, screen }) => {
  const baseUrl = app.baseUrl ?? '';
  await routes(baseUrl, [{ method: 'GET', path: '/auth/sessions', info: { sessions: [] } }]);
  const escapes = await openFirst(browser, app);
  await expect.poll(() => connected(baseUrl, 'A'), { timeout: 10000 }).toBe(1);

  await screen.getByRole('tab', 'You').first().click();
  await expect(screen.getByText('Argus returned no session for you.', { exact: true })).toBeVisible({ timeout: 10000 });
  await expect(screen.getByText('Looking for your sessions…', { exact: true })).toBeHidden();

  expect(escapes).toEqual([]);
});

test('a notification link whose notice never arrives says so and offers a retry', async ({ app, browser, screen }) => {
  const baseUrl = app.baseUrl ?? '';
  const escapes = await openFirst(browser, app);
  await expect.poll(() => connected(baseUrl, 'A'), { timeout: 10000 }).toBe(1);

  await app.open('/notification?notificationId=999');
  await expect(screen.getByText('Opening the notification', { exact: true })).toBeVisible({ timeout: 10000 });
  await expect(screen.getByText('I could not find this notification', { exact: true })).toBeVisible({ timeout: 15000 });
  await expect(screen.getByText('Retry', { exact: true })).toBeVisible();

  expect(escapes).toEqual([]);
});

test('home does not say nothing is pending before anything was synced', async ({ app, browser, screen }) => {
  const baseUrl = app.baseUrl ?? '';
  await control(baseUrl, 'refuse?device=A&ms=600000');
  const escapes = await openFirst(browser, app);

  await expect(screen.getByRole('progressbar', 'Loading Home')).toBeVisible({ timeout: 15000 });
  await expect(screen.getByText('Nothing due today', { exact: true })).toBeHidden();
  await expect(screen.getByText('Free day', { exact: true })).toBeHidden();
  await expect(screen.getByRole('heading', 'All quiet.')).toBeHidden();

  expect(escapes).toEqual([]);
});
