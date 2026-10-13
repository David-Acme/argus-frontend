import { connected, patchContext } from './support/harness';
import { expect, openFirst, test } from './support/devices';

test('a role whose module is off keeps the account and shows what still works', async ({ app, browser, screen }) => {
  const baseUrl = app.baseUrl ?? '';
  await patchContext(baseUrl, {
    role: 'guard',
    roleActive: false,
    roles: [{ id: 'guard', module: 'surveillance', active: false }],
    capabilities: ['profile.read', 'sessions.manage', 'safety.panic', 'safety.read', 'notifications.read'],
  });
  const escapes = await openFirst(browser, app);
  await expect.poll(() => connected(baseUrl, 'A'), { timeout: 10000 }).toBe(1);

  await expect(
    screen.getByRole('heading', 'Your Guard role will switch on again when the house uses Surveillance again')
  ).toBeVisible({ timeout: 10000 });
  await expect(screen.getByText('Always available')).toBeVisible();
  await expect(screen.getByRole('button', 'Panic button')).toBeVisible();
  await expect(screen.getByRole('button', 'Welcome, Ana')).toBeHidden();

  await screen.getByRole('button', 'Go to my profile').click();
  await expect(screen.getByRole('heading', 'Sessions and devices')).toBeVisible();

  expect(escapes).toEqual([]);
});
