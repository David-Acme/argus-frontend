import { connected, emit } from './support/harness';
import { expect, openFirst, test } from './support/devices';

const LIVE_MS = 2000;

test('a member enrolled on a third device appears in People on both devices, live', async ({
  app,
  browser,
  screen,
  second,
}) => {
  const baseUrl = app.baseUrl ?? '';
  const escapes = await openFirst(browser, app);
  await second.open();
  await expect.poll(() => connected(baseUrl, 'A'), { timeout: 10000 }).toBe(1);
  await expect.poll(() => connected(baseUrl, 'B'), { timeout: 10000 }).toBe(1);

  await screen.getByRole('tab', 'You').first().click();
  await screen
    .getByRole('button', /^People, /)
    .first()
    .click();
  await second.page.getByRole('tab', { name: 'You', exact: true }).first().click();
  await second.page
    .getByRole('button', { name: /^People, / })
    .first()
    .click();
  await expect(screen.getByRole('heading', 'People')).toBeVisible();
  await expect(screen.getByText('Ana Ruiz').first()).toBeVisible();

  const at = Math.floor(Date.now() / 1000);
  await emit(baseUrl, [
    {
      frame: {
        operation: 4,
        option: 'user',
        info: {
          id: 9,
          name: 'Lucía',
          lastName: 'Ramos',
          role: 'resident',
          lang: 'es',
          isActive: true,
          createdAt: at,
          updatedAt: at,
        },
      },
    },
    {
      frame: {
        operation: 4,
        option: 'person',
        info: {
          id: 31,
          userId: 9,
          name: 'Lucía',
          alias: '',
          observation: '',
          status: 'known',
          firstSeenAt: at,
          lastSeenAt: at,
          createdAt: at,
          updatedAt: null,
          deletedAt: null,
        },
      },
    },
  ]);

  await expect(screen.getByText('Lucía Ramos').first()).toBeVisible({ timeout: LIVE_MS });
  await expect
    .poll(() => second.page.getByText('Lucía Ramos').count(), { timeout: LIVE_MS })
    .toBeGreaterThan(0);

  expect(escapes).toEqual([]);
  expect(second.escapes).toEqual([]);
});
