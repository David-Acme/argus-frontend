import { connected, routes } from './support/harness';
import { expect, openFirst, test } from './support/devices';

const incident = (state: 'active' | 'false_alarm', verdict: '' | 'false_alarm') => ({
  id: 5,
  threadKey: 'guard:5',
  kind: 'guard_episode',
  environmentId: 1,
  environmentName: 'Casa',
  cameraId: 3,
  cameraName: 'Patio trasero',
  episodeId: 51,
  strategy: 'ordered',
  state,
  step: 1,
  stepCount: 2,
  attendedBy: null,
  verdict,
  verdictBy: verdict ? { userId: 1, name: 'Ana' } : null,
  verdictAt: verdict ? 1791860100 : 0,
  emergencyNumber: '105',
  contacts: [],
  showContacts: false,
  offers: ['attend', 'verdict'],
  createdAt: 1791860000,
  updatedAt: 1791860000,
  mine: { step: 1, mode: 'call', mandatory: false, discreet: false, reached: true },
});

test('an alert raised for the user is on Home with its two answers, and a confirmed verdict is sent and clears it', async ({
  app,
  browser,
  screen,
}) => {
  const baseUrl = app.baseUrl ?? '';
  await routes(baseUrl, [
    { method: 'GET', path: '/notification/responses', info: [incident('active', '')] },
    {
      method: 'PATCH',
      path: '/notification/responses/5',
      info: incident('false_alarm', 'false_alarm'),
      sets: [{ method: 'GET', path: '/notification/responses', info: [] }],
    },
  ]);
  const escapes = await openFirst(browser, app);
  await expect.poll(() => connected(baseUrl, 'A'), { timeout: 10000 }).toBe(1);

  await expect(screen.getByRole('heading', 'Someone at Patio trasero.')).toBeVisible({ timeout: 10000 });
  await expect(screen.getByRole('alert').last()).toBeVisible();
  await expect(screen.getByText('It is real', { exact: true })).toBeVisible();
  await screen.getByText('It is a false alarm', { exact: true }).click();
  await expect(screen.getByText('Is it a false alarm?')).toBeVisible();
  await screen.getByText('False alarm', { exact: true }).last().click();

  const requests = async (): Promise<string[]> =>
    ((await (await fetch(new URL('/__e2e/requests', baseUrl))).json()) as { requests: string[] }).requests;
  await expect.poll(requests).toContain('PATCH /notification/responses/5 @A');
  await expect(screen.getByText('It is real', { exact: true })).toBeHidden({ timeout: 5000 });
  await expect(screen.getByRole('heading', 'Someone at Patio trasero.')).toBeHidden();

  expect(escapes).toEqual([]);
});
