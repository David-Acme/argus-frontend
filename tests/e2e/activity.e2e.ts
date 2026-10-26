import { connected, routes } from './support/harness';
import { expect, openFirst, test } from './support/devices';

const LIVE_MS = 2000;

test('what one device does reaches the activity history open on the other, live', async ({ app, browser, screen, second }) => {
  const baseUrl = app.baseUrl ?? '';
  const at = Math.floor(Date.now() / 1000);
  const project = {
    id: 700,
    ownerId: 1,
    name: 'Huerto',
    description: '',
    status: 'active',
    color: 'blue',
    startsAt: null,
    targetAt: null,
    createdAt: at,
    updatedAt: at,
    deletedAt: null,
  };
  const entry = {
    id: 41,
    userId: 1,
    recordId: project.id,
    table: 'project',
    module: 'productivity',
    action: 'create',
    oldData: null,
    newData: null,
    ipAddress: '',
    createdAt: at,
  };
  await routes(baseUrl, [
    { method: 'GET', path: '/sync/activity', info: { items: [], nextCursor: null } },
    {
      method: 'POST',
      path: '/project',
      status: 201,
      info: project,
      sets: [{ method: 'GET', path: '/sync/activity', info: { items: [entry], nextCursor: null } }],
      emits: [
        { frame: { operation: 4, option: 'project', info: project } },
        { frame: { operation: 14, option: 'resource_changed', info: { domain: 'activity', scope: 'entries', ids: [] } } },
      ],
    },
  ]);
  const escapes = await openFirst(browser, app);
  await second.open();
  await expect.poll(() => connected(baseUrl, 'A'), { timeout: 10000 }).toBe(1);
  await expect.poll(() => connected(baseUrl, 'B'), { timeout: 10000 }).toBe(1);

  await second.page.getByRole('tab', { name: 'Settings' }).first().click();
  await second.page.getByText('Activity history', { exact: true }).click();
  await expect.poll(() => second.page.getByRole('heading', { name: 'Activity' }).count(), { timeout: 10000 }).toBe(1);
  await expect.poll(() => second.page.getByText('created a project').count()).toBe(0);

  await screen.getByRole('tab', 'Agenda').first().click();
  await screen.getByRole('button', 'Projects').first().click();
  await screen.getByRole('button', 'New project').first().click();
  await screen.getByPlaceholder('Move, renovation, trip…').fill(project.name);
  await screen.getByText('Save', { exact: true }).click();

  await expect.poll(() => second.page.getByText(/Ana.* created a project/).count(), { timeout: LIVE_MS }).toBe(1);

  expect(escapes).toEqual([]);
  expect(second.escapes).toEqual([]);
});
