import type { Page } from 'playwright-core';
import { connected, routes, store } from './support/harness';
import { expect, openFirst, test } from './support/devices';
import { NOTIFICATION_FEED_PAGE_SIZE } from '../../src/shared/constants/cache.constant';

const at = Math.floor(Date.now() / 1000);

const LIVE_MS = 2000;

const UNDO_MS = 6000;

const deletedAt = at + 60;

const notification = (id: number, title: string) => ({
  id,
  userId: 1,
  type: 'system',
  title,
  body: 'Left with the doorman',
  data: {},
  isRead: true,
  readAt: at,
  createdAt: at + id - 500,
});

const FEED = '/notification';

const deleteLabel = (title: string): string => `Delete notification: ${title}`;

const auditFrame = (id: number) => ({
  frame: {
    operation: 6,
    option: 'user_audit_log',
    info: {
      id: 1,
      userId: 1,
      recordId: id,
      tableName: 'notification',
      changes: { deletedAt: { previous: null, current: deletedAt } },
      priority: 1,
      eventTimestamp: deletedAt * 1000,
      createdAt: deletedAt,
    },
  },
});

const deleteFrame = (id: number) => ({ frame: { operation: 5, option: 'notification', info: { id, deletedAt } } });

const countButtons = (page: Page, name: string): Promise<number> => page.getByRole('button', { name, exact: true }).count();

const requests = async (baseUrl: string): Promise<string[]> =>
  ((await (await fetch(new URL('/__e2e/requests', baseUrl))).json()) as { requests: string[] }).requests;

test('a notification deleted on one device leaves it at once and leaves the other device live', async ({
  app,
  browser,
  screen,
  second,
}) => {
  const baseUrl = app.baseUrl ?? '';
  await store(baseUrl, 'notification', notification(501, 'Package at the door'));
  await store(baseUrl, 'notification', notification(502, 'Water bill due'));
  await routes(baseUrl, [
    { method: 'DELETE', path: '/notification/501', status: 204, emits: [auditFrame(501), deleteFrame(501)] },
  ]);
  const escapes = await openFirst(browser, app);
  await app.open(FEED);
  await second.open(FEED);
  await expect.poll(() => connected(baseUrl, 'A'), { timeout: 10000 }).toBe(1);
  await expect.poll(() => connected(baseUrl, 'B'), { timeout: 10000 }).toBe(1);

  const removePackage = deleteLabel('Package at the door');
  await expect.poll(() => countButtons(second.page, removePackage), { timeout: 10000 }).toBe(1);
  await screen.getByRole('button', removePackage).click();
  await expect(screen.getByRole('button', removePackage)).toBeHidden({ timeout: LIVE_MS });

  await expect.poll(() => requests(baseUrl), { timeout: UNDO_MS + LIVE_MS }).toContain('DELETE /notification/501 @A');
  await expect.poll(() => countButtons(second.page, removePackage), { timeout: LIVE_MS }).toBe(0);
  expect(await countButtons(second.page, deleteLabel('Water bill due'))).toBe(1);
  await expect(screen.getByRole('button', deleteLabel('Water bill due'))).toBeVisible();

  expect(escapes).toEqual([]);
  expect(second.escapes).toEqual([]);
});

test('a delete whose Delete frame never arrives still leaves the other device, by its audit diff', async ({
  app,
  browser,
  screen,
  second,
}) => {
  const baseUrl = app.baseUrl ?? '';
  await store(baseUrl, 'notification', notification(601, 'Garage left open'));
  await routes(baseUrl, [{ method: 'DELETE', path: '/notification/601', status: 204, emits: [auditFrame(601)] }]);
  const escapes = await openFirst(browser, app);
  await app.open(FEED);
  await second.open(FEED);
  await expect.poll(() => connected(baseUrl, 'A'), { timeout: 10000 }).toBe(1);
  await expect.poll(() => connected(baseUrl, 'B'), { timeout: 10000 }).toBe(1);

  const removeGarage = deleteLabel('Garage left open');
  await expect.poll(() => countButtons(second.page, removeGarage), { timeout: 10000 }).toBe(1);
  await screen.getByRole('button', removeGarage).click();

  await expect.poll(() => requests(baseUrl), { timeout: UNDO_MS + LIVE_MS }).toContain('DELETE /notification/601 @A');
  await expect.poll(() => countButtons(second.page, removeGarage), { timeout: LIVE_MS }).toBe(0);

  expect(escapes).toEqual([]);
  expect(second.escapes).toEqual([]);
});

const EPISODE = 'guard:episode:41';

const EPISODE_PATH = `/notification/thread/${encodeURIComponent(EPISODE)}`;

const episodeEntry = (id: number) => ({
  ...notification(id, `Motion in the yard ${id}`),
  data: { threadKey: EPISODE, kind: 'guard_episode' },
});

const episodeAudit = (auditId: number, id: number) => ({
  frame: { ...auditFrame(id).frame, info: { ...auditFrame(id).frame.info, id: auditId } },
});

test('a thread longer than the loaded page is deleted by its key, and every entry leaves both devices', async ({
  app,
  browser,
  screen,
  second,
}) => {
  const baseUrl = app.baseUrl ?? '';
  const ids = Array.from({ length: NOTIFICATION_FEED_PAGE_SIZE + 5 }, (_, index) => 700 + index);
  for (const id of ids) await store(baseUrl, 'notification', episodeEntry(id));
  await store(baseUrl, 'notification', notification(800, 'Water bill due'));
  await routes(baseUrl, [
    {
      method: 'DELETE',
      path: EPISODE_PATH,
      status: 204,
      emits: ids.flatMap((id, index) => [episodeAudit(10 + index, id), deleteFrame(id)]),
    },
  ]);
  const escapes = await openFirst(browser, app);
  await app.open(FEED);
  await second.open(FEED);
  await expect.poll(() => connected(baseUrl, 'A'), { timeout: 10000 }).toBe(1);
  await expect.poll(() => connected(baseUrl, 'B'), { timeout: 10000 }).toBe(1);

  const latest = deleteLabel(`Motion in the yard ${ids.at(-1) ?? 0}`);
  await expect.poll(() => countButtons(second.page, latest), { timeout: 10000 }).toBe(1);
  await screen.getByRole('button', latest).click();
  await expect(screen.getByRole('button', latest)).toBeHidden({ timeout: LIVE_MS });

  await expect.poll(() => requests(baseUrl), { timeout: UNDO_MS + LIVE_MS }).toContain(`DELETE ${EPISODE_PATH} @A`);
  const sent = await requests(baseUrl);
  expect(sent.filter((line) => line.startsWith('DELETE /notification/'))).toEqual([`DELETE ${EPISODE_PATH} @A`]);
  await expect.poll(() => countButtons(second.page, latest), { timeout: LIVE_MS }).toBe(0);
  expect(await countButtons(second.page, deleteLabel('Water bill due'))).toBe(1);
  await expect(screen.getByRole('button', deleteLabel('Water bill due'))).toBeVisible();

  expect(escapes).toEqual([]);
  expect(second.escapes).toEqual([]);
});

test('a thread the server no longer has counts as deleted, with no error', async ({ app, browser, screen }) => {
  const baseUrl = app.baseUrl ?? '';
  await store(baseUrl, 'notification', episodeEntry(901));
  await store(baseUrl, 'notification', episodeEntry(902));
  await routes(baseUrl, [
    {
      method: 'DELETE',
      path: EPISODE_PATH,
      status: 404,
      errors: { code: 'NOT_FOUND', message: 'Notification not found' },
    },
  ]);
  const escapes = await openFirst(browser, app);
  await app.open(FEED);
  await expect.poll(() => connected(baseUrl, 'A'), { timeout: 10000 }).toBe(1);

  const latest = deleteLabel('Motion in the yard 902');
  await expect(screen.getByRole('button', latest)).toBeVisible({ timeout: 10000 });
  await screen.getByRole('button', latest).click();

  await expect.poll(() => requests(baseUrl), { timeout: UNDO_MS + LIVE_MS }).toContain(`DELETE ${EPISODE_PATH} @A`);
  await expect(screen.getByText('The notification could not be deleted', { exact: true })).toBeHidden({
    timeout: LIVE_MS,
  });
  await expect(screen.getByRole('button', latest)).toBeHidden();

  expect(escapes).toEqual([]);
});

test('a delete on the full feed shows Undo, and Undo keeps the item and sends nothing', async ({
  app,
  browser,
  screen,
}) => {
  const baseUrl = app.baseUrl ?? '';
  await store(baseUrl, 'notification', notification(951, 'Gate left open'));
  await routes(baseUrl, [{ method: 'DELETE', path: '/notification/951', status: 204, emits: [deleteFrame(951)] }]);
  const escapes = await openFirst(browser, app);
  await app.open(FEED);
  await expect.poll(() => connected(baseUrl, 'A'), { timeout: 10000 }).toBe(1);

  const removeGate = deleteLabel('Gate left open');
  await expect(screen.getByRole('button', removeGate)).toBeVisible({ timeout: 10000 });
  await screen.getByRole('button', removeGate).click();
  await expect(screen.getByRole('button', removeGate)).toBeHidden({ timeout: LIVE_MS });
  await expect(screen.getByText('Notification deleted', { exact: true })).toBeVisible({ timeout: LIVE_MS });
  await screen.getByRole('button', 'Undo').click();

  await expect(screen.getByRole('button', removeGate)).toBeVisible({ timeout: LIVE_MS });
  await new Promise((resolve) => setTimeout(resolve, UNDO_MS));
  expect(await requests(baseUrl)).not.toContain('DELETE /notification/951 @A');

  expect(escapes).toEqual([]);
});
