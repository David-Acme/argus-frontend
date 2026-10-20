import type { RouteSpec } from './support/fake-argus';
import { connected, routes } from './support/harness';
import { expect, openFirst, test } from './support/devices';
import { environment, episode, populated } from './support/screens';

const RAW_KEY = /\b(?:screens|common)\.[a-z0-9-]+(?:\.[a-z0-9_-]+)+/;

const at = Math.floor(Date.now() / 1000);

const unknownValues: RouteSpec[] = [
  ...populated,
  { method: 'GET', path: '/guard/environments', info: [environment('away')] },
  {
    method: 'GET',
    path: '/guard/episodes',
    info: {
      rows: [
        { ...episode, id: 61, groupId: 61, subject: 'household', lastSeen: at, firstSeen: at },
        { ...episode, id: 62, groupId: 62, state: 'resolved', resolution: 'handed_over', subject: 'stranger', lastSeen: at - 60, firstSeen: at - 60 },
      ],
      nextBefore: null,
    },
  },
];

test('a value the client does not know reads as text, never as a translation key', async ({ app, browser, screen }) => {
  const baseUrl = app.baseUrl ?? '';
  await routes(baseUrl, unknownValues);
  const escapes = await openFirst(browser, app);
  await expect.poll(() => connected(baseUrl, 'A'), { timeout: 10000 }).toBe(1);

  for (const tab of ['Open security', 'Settings', 'Profile']) {
    await screen.getByRole('button', tab).first().click();
    await new Promise((resolve) => setTimeout(resolve, 1500));
    const text = await browser.evaluate(() => document.body.innerText);
    expect(text.match(RAW_KEY)?.[0] ?? null).toBeNull();
  }

  expect(escapes).toEqual([]);
});
