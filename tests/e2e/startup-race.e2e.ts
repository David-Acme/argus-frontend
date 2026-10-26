import { connected, routes } from './support/harness';
import { expect, openFirst, test } from './support/devices';
import { environment, incident } from './support/screens';

const off = { presence: false, faceCameras: false, voiceLearning: false, cameraAudio: false };

const undecided = {
  decided: false,
  noticeVersion: 0,
  current: false,
  decidedAt: null,
  updatedAt: null,
  choices: off,
  effective: off,
  currentNoticeVersion: 2,
  household: { presence: true, faceCameras: true, voiceLearning: true, cameraAudio: true },
};

test('a consent answer that arrives while the session starts still shows the privacy gate', async ({
  app,
  browser,
  screen,
}) => {
  const baseUrl = app.baseUrl ?? '';
  await routes(baseUrl, [{ method: 'GET', path: '/privacy/me', info: undecided }]);
  const escapes = await openFirst(browser, app);
  await expect.poll(() => connected(baseUrl, 'A'), { timeout: 10000 }).toBe(1);

  await expect(screen.getByText('Accept and continue', { exact: true })).toBeVisible({ timeout: 10000 });
  await expect(screen.getByRole('tab', 'Settings')).toBeHidden();

  expect(escapes).toEqual([]);
});

test('while the consent state is unknown the app stays closed, and a failed read offers a retry', async ({
  app,
  browser,
  screen,
}) => {
  const baseUrl = app.baseUrl ?? '';
  await routes(baseUrl, [
    { method: 'GET', path: '/privacy/me', status: 503, errors: { code: 'SERVICE_UNAVAILABLE', message: 'down' } },
  ]);
  const escapes = await openFirst(browser, app);
  await expect.poll(() => connected(baseUrl, 'A'), { timeout: 10000 }).toBe(1);

  await expect(screen.getByText('Retry', { exact: true })).toBeVisible({ timeout: 10000 });
  await expect(screen.getByRole('tab', 'Settings')).toBeHidden();

  await routes(baseUrl, [{ method: 'GET', path: '/privacy/me', info: undecided }]);
  await screen.getByText('Retry', { exact: true }).click();
  await expect(screen.getByText('Accept and continue', { exact: true })).toBeVisible({ timeout: 10000 });

  expect(escapes).toEqual([]);
});

test('home keeps the answers a fast server gives while the session starts', async ({ app, browser, screen }) => {
  const baseUrl = app.baseUrl ?? '';
  await routes(baseUrl, [
    { method: 'GET', path: '/notification/responses', info: [incident] },
    { method: 'GET', path: '/guard/environments', info: [environment('away')] },
  ]);
  const escapes = await openFirst(browser, app);
  await expect.poll(() => connected(baseUrl, 'A'), { timeout: 10000 }).toBe(1);

  await expect(screen.getByText('It is real', { exact: true })).toBeVisible({ timeout: 10000 });

  expect(escapes).toEqual([]);
});

test('a camera conversation a fast server reports at start-up is still shown', async ({ app, browser, screen }) => {
  const baseUrl = app.baseUrl ?? '';
  const now = Math.floor(Date.now() / 1000);
  await routes(baseUrl, [
    {
      method: 'GET',
      path: '/rtc/watch',
      info: {
        conversations: [
          {
            conversationId: 'w1',
            cameraId: 3,
            cameraName: 'Patio trasero',
            state: 'listening',
            handoff: 'camera',
            audience: 'member',
            startedAt: now - 60,
            updatedAt: now - 5,
            resumableUntil: null,
            endReason: null,
            turns: [],
          },
        ],
      },
    },
  ]);
  const escapes = await openFirst(browser, app);
  await expect.poll(() => connected(baseUrl, 'A'), { timeout: 10000 }).toBe(1);
  await app.open('/watch');
  await expect(screen.getByText('Conversation at Patio trasero', { exact: true })).toBeVisible({ timeout: 10000 });
  expect(escapes).toEqual([]);
});
