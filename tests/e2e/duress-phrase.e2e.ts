import { connected, routes } from './support/harness';
import { expect, openFirst, test } from './support/devices';

const LIVE_MS = 2000;

const PHRASE = 'april rain brings the flowers';

const status = (patch: Record<string, unknown>) => ({
  duressEnabled: true,
  hasPin: false,
  hasPhrase: false,
  alertsReach: 'others',
  ...patch,
});

const recorded = async (
  baseUrl: string
): Promise<{ requests: string[]; bodies: Record<string, string> }> =>
  (await (await fetch(new URL('/__e2e/requests', baseUrl))).json()) as {
    requests: string[];
    bodies: Record<string, string>;
  };

test('the owner sets the duress phrase, sees that one is set, and no copy of the words stays on the device', async ({
  app,
  second,
}) => {
  const baseUrl = app.baseUrl ?? '';
  await routes(baseUrl, [
    { method: 'GET', path: '/guard/safety', info: status({}) },
    {
      method: 'PATCH',
      path: '/guard/safety',
      info: status({ hasPhrase: true }),
      sets: [{ method: 'GET', path: '/guard/safety', info: status({ hasPhrase: true }) }],
      emits: [
        {
          frame: {
            operation: 14,
            option: 'resource_changed',
            info: { domain: 'guard', scope: 'duress', ids: [] },
          },
        },
      ],
    },
  ]);
  await second.open();
  await expect.poll(() => connected(baseUrl, 'B'), { timeout: 10000 }).toBe(1);

  await second.page.getByRole('tab', { name: 'You' }).first().click();
  await second.page.getByRole('checkbox', { name: 'Your account' }).first().click();
  await second.page
    .getByRole('button', { name: /^Personal safety/ })
    .first()
    .click();
  await second.page.getByText('Choose the duress phrase', { exact: true }).click();
  await second.page.locator('[role="dialog"] input').first().fill(PHRASE);
  await second.page.getByText('Save', { exact: true }).last().click();

  await expect
    .poll(async () => (await recorded(baseUrl)).requests, { timeout: LIVE_MS })
    .toContain('PATCH /guard/safety @B');
  expect(JSON.parse((await recorded(baseUrl)).bodies['PATCH /guard/safety @B'] ?? '{}')).toEqual({
    duressEnabled: true,
    duressPhrase: PHRASE,
  });
  await expect
    .poll(() => second.page.getByText('Change the duress phrase', { exact: true }).count(), {
      timeout: LIVE_MS,
    })
    .toBe(1);
  expect(
    await second.page
      .getByText('A phrase is set. Nobody can see it, not even you.', { exact: true })
      .count()
  ).toBe(1);

  const kept = await second.page.evaluate(() => JSON.stringify(Object.entries(localStorage)));
  expect(kept).not.toContain(PHRASE);

  expect(second.escapes).toEqual([]);
});

test('turning duress on when the alert would reach nobody warns first, and goes ahead when asked to', async ({
  app,
  browser,
  screen,
}) => {
  const baseUrl = app.baseUrl ?? '';
  await routes(baseUrl, [
    {
      method: 'GET',
      path: '/guard/safety',
      info: status({ duressEnabled: false, alertsReach: 'nobody' }),
    },
    {
      method: 'PATCH',
      path: '/guard/safety',
      info: status({ alertsReach: 'nobody' }),
      sets: [{ method: 'GET', path: '/guard/safety', info: status({ alertsReach: 'nobody' }) }],
    },
  ]);
  const escapes = await openFirst(browser, app);
  await expect.poll(() => connected(baseUrl, 'A'), { timeout: 10000 }).toBe(1);

  await screen.getByRole('tab', 'You').first().click();
  await screen.getByRole('checkbox', 'Your account').first().click();
  await screen
    .getByRole('button', /^Personal safety/)
    .first()
    .click();
  await expect(
    screen.getByText(
      'If you ask for help, the alert would reach nobody: there is no one else in the household and no emergency contact.',
      { exact: true }
    )
  ).toBeVisible({ timeout: 10000 });
  await screen.getByRole('switch', 'Disarm codes').click();
  await expect(screen.getByText('The alert would reach nobody', { exact: true })).toBeVisible({
    timeout: LIVE_MS,
  });
  await screen.getByText('Turn on anyway', { exact: true }).click();

  await expect
    .poll(async () => (await recorded(baseUrl)).requests, { timeout: LIVE_MS })
    .toContain('PATCH /guard/safety @A');
  expect(JSON.parse((await recorded(baseUrl)).bodies['PATCH /guard/safety @A'] ?? '{}')).toEqual({
    duressEnabled: true,
  });

  expect(escapes).toEqual([]);
});
