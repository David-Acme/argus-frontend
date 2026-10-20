import { connected, routes } from './support/harness';
import { expect, openFirst, test } from './support/devices';
import { unpairedDevice } from './support/seed';

const now = Math.floor(Date.now() / 1000);

test('pairing on a computer speaks of the computer, never of scanning or a phone', async ({ app, browser, screen }) => {
  const escapes = await openFirst(browser, app, unpairedDevice('A'));
  await app.open('/welcome/pairing');
  await expect(screen.getByText('Link your server', { exact: true })).toBeVisible({ timeout: 10000 });
  const text = await browser.evaluate(() => document.body.innerText);
  expect(text).not.toMatch(/this phone/i);
  expect(text).not.toMatch(/Scan your Argus/);
  expect(escapes).toEqual([]);
});

test('a paused camera conversation counts down in minutes, not raw seconds', async ({ app, browser, screen }) => {
  const baseUrl = app.baseUrl ?? '';
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
            state: 'resumable',
            handoff: 'camera',
            audience: 'member',
            startedAt: now - 120,
            updatedAt: now - 5,
            resumableUntil: now + 3590,
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
  await expect(screen.getByText(/You can carry on here for/)).toBeVisible({ timeout: 10000 });
  const text = await browser.evaluate(() => document.body.innerText);
  expect(text).not.toMatch(/for \d+ s\./);
  expect(text).toMatch(/for (59|1:00):\d\d/);
  expect(escapes).toEqual([]);
});
