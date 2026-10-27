import { connected, routes, store } from './support/harness';
import { expect, openFirst, test } from './support/devices';

const LIVE_MS = 2000;

const at = Math.floor(Date.now() / 1000) - 600;

const message = (id: number, patch: Record<string, unknown>) => ({
  id,
  userId: 1,
  counterpartId: 0,
  counterpartName: '',
  direction: 'in',
  kind: 'turn',
  body: '',
  leg: null,
  state: 'delivered',
  messageKey: `msg-${id}`,
  replyToKey: null,
  isRead: true,
  readAt: null,
  createdAt: at + id,
  updatedAt: null,
  deletedAt: null,
  ...patch,
});

const seedHousehold = async (baseUrl: string): Promise<void> => {
  await store(baseUrl, 'conversation_message', message(1, { direction: 'out', body: 'What is on the agenda today?', leg: 'laptop' }));
  await store(baseUrl, 'conversation_message', message(2, { body: 'Nothing until six.', leg: 'camera' }));
  await store(
    baseUrl,
    'conversation_message',
    message(3, { counterpartId: 3, counterpartName: 'David', kind: 'relay', body: 'Dinner is ready', state: 'received', isRead: false })
  );
  await store(
    baseUrl,
    'conversation_message',
    message(4, { counterpartId: 5, counterpartName: 'Lucía', direction: 'out', kind: 'relay', body: 'Bring bread', state: 'notified' })
  );
};

const readAudit = {
  frame: {
    operation: 6,
    option: 'user_audit_log',
    info: {
      id: 1,
      userId: 1,
      recordId: 3,
      tableName: 'conversation_message',
      changes: { isRead: { previous: false, current: true }, readAt: { previous: null, current: at + 60 } },
      priority: 1,
      eventTimestamp: (at + 60) * 1000,
      createdAt: at + 60,
    },
  },
};

const requests = async (baseUrl: string): Promise<string[]> =>
  ((await (await fetch(new URL('/__e2e/requests', baseUrl))).json()) as { requests: string[] }).requests;

test('on the desktop the conversations sit beside the Argus thread, Argus first, then the household with its unread and delivery state', async ({ app, browser, screen }) => {
  const baseUrl = app.baseUrl ?? '';
  await seedHousehold(baseUrl);
  const escapes = await openFirst(browser, app);
  await expect.poll(() => connected(baseUrl, 'A'), { timeout: 10000 }).toBe(1);

  await screen.getByRole('tab', 'Argus').first().click();
  await expect(screen.getByRole('button', /^Argus\. /)).toBeVisible({ timeout: 10000 });
  await expect(screen.getByText('Dinner is ready', { exact: true })).toBeVisible();
  expect(await browser.evaluate(() => document.body.innerText.includes('You: Bring bread · I left the message'))).toBe(true);
  await expect(screen.getByText('What Argus did', { exact: true })).toBeVisible();
  await expect(screen.getByText('Hold Space to talk', { exact: true })).toBeVisible();

  expect(escapes).toEqual([]);
});

test('opening a thread reads it, shows where Argus turns were said, and clearing it leaves only the viewer copy', async ({
  app,
  browser,
  screen,
}) => {
  const baseUrl = app.baseUrl ?? '';
  await seedHousehold(baseUrl);
  await routes(baseUrl, [
    { method: 'PATCH', path: '/conversation/3/read', info: { updated: 1 }, emits: [readAudit] },
    {
      method: 'DELETE',
      path: '/conversation/3',
      status: 204,
      emits: [{ frame: { operation: 5, option: 'conversation_message', info: { id: 3, deletedAt: at + 90 } } }],
    },
  ]);
  const escapes = await openFirst(browser, app);
  await expect.poll(() => connected(baseUrl, 'A'), { timeout: 10000 }).toBe(1);

  await screen.getByRole('tab', 'Argus').first().click();
  await expect(screen.getByText(/^From the laptop · /)).toBeVisible({ timeout: 10000 });
  await expect(screen.getByText(/^Through the camera · /)).toBeVisible();
  await expect(screen.getByRole('heading', 'Today')).toBeVisible();
  expect(await requests(baseUrl)).not.toContain('PATCH /conversation/0/read @A');

  await screen.getByText('Dinner is ready', { exact: true }).click();
  await expect(
    screen.getByText(
      'David gets it under your name: if they are talking to Argus it may say it aloud; if not, it leaves them a notice. You will not learn whether they read it or where they are.',
      { exact: true }
    )
  ).toBeVisible({
    timeout: 10000,
  });
  await expect.poll(() => requests(baseUrl), { timeout: LIVE_MS }).toContain('PATCH /conversation/3/read @A');

  await screen.getByRole('button', 'Clear the conversation').click();
  await expect(screen.getByText('Clear the conversation with David?', { exact: true })).toBeVisible();
  await screen.getByText('Clear', { exact: true }).last().click();

  await expect.poll(() => requests(baseUrl), { timeout: LIVE_MS }).toContain('DELETE /conversation/3 @A');
  await expect
    .poll(() => browser.evaluate(() => document.body.innerText.includes('Dinner is ready')), { timeout: LIVE_MS })
    .toBe(false);
  expect(await browser.evaluate(() => document.body.innerText.includes('You: Bring bread'))).toBe(true);

  expect(escapes).toEqual([]);
});
