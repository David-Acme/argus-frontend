import { connected, routes } from './support/harness';
import { expect, openFirst, test } from './support/devices';

const LIVE_MS = 2000;

test('codes created on one device are known to the other at once, so it will ask for them', async ({
  app,
  browser,
  screen,
  second,
}) => {
  const baseUrl = app.baseUrl ?? '';
  await routes(baseUrl, [
    { method: 'GET', path: '/guard/safety', info: { duressEnabled: true, hasPin: false } },
    {
      method: 'PUT',
      path: '/guard/safety/pin',
      info: { duressEnabled: true, hasPin: true },
      sets: [{ method: 'GET', path: '/guard/safety', info: { duressEnabled: true, hasPin: true } }],
      emits: [
        {
          frame: {
            operation: 14,
            option: 'resource_changed',
            info: { domain: 'guard', scope: 'safety_pin', ids: [] },
          },
        },
      ],
    },
  ]);
  const escapes = await openFirst(browser, app);
  await second.open();
  await expect.poll(() => connected(baseUrl, 'A'), { timeout: 10000 }).toBe(1);
  await expect.poll(() => connected(baseUrl, 'B'), { timeout: 10000 }).toBe(1);

  await second.page.getByRole('tab', { name: 'You' }).first().click();
  await second.page.getByRole('checkbox', { name: 'Your account' }).first().click();
  await second.page
    .getByRole('button', { name: /^Personal safety/ })
    .first()
    .click();
  await expect
    .poll(() => second.page.getByText('Create my codes').count(), { timeout: 10000 })
    .toBe(1);

  await screen.getByRole('tab', 'You').first().click();
  await screen.getByRole('checkbox', 'Your account').first().click();
  await screen
    .getByRole('button', /^Personal safety/)
    .first()
    .click();
  await screen.getByText('Create my codes', { exact: true }).click();
  await browser.locator('[role="dialog"] input').nth(0).fill('2580');
  await browser.locator('[role="dialog"] input').nth(1).fill('9137');
  await screen.getByText('Save', { exact: true }).last().click();

  await expect
    .poll(() => second.page.getByText('Change my codes').count(), { timeout: LIVE_MS })
    .toBe(1);
  await expect
    .poll(() => second.page.getByText('Turning guarding off will ask for your code.').count())
    .toBe(1);

  expect(escapes).toEqual([]);
  expect(second.escapes).toEqual([]);
});
