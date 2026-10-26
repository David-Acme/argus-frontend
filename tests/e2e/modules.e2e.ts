import type { Page } from 'playwright-core';
import { ownerContext, type RouteSpec } from './support/fake-argus';
import { connected, emit, routes, store } from './support/harness';
import { expect, openFirst, test } from './support/devices';

const LIVE_MS = 2000;

const switchFrames = (enabled: boolean) => [
  {
    frame: {
      operation: 12,
      option: 'module_update',
      info: { modules: [{ id: 'core', enabled: true }, { id: 'productivity', enabled }, { id: 'surveillance', enabled: true }] },
    },
  },
  { frame: { operation: 13, option: 'context_update', info: ownerContext({ productivity: enabled }) } },
];

const moduleRoutes: RouteSpec[] = [
  { method: 'POST', path: '/modules/productivity/disable', modules: { productivity: false }, emits: switchFrames(false) },
  { method: 'POST', path: '/modules/productivity/install', modules: { productivity: true }, emits: switchFrames(true) },
];

const homeProductivity = async (page: Page): Promise<number> =>
  (await page.getByRole('heading', { name: 'Today', exact: true }).count()) +
  (await page.getByRole('heading', { name: 'Projects', exact: true }).count()) +
  (await page.getByRole('button', { name: 'See all: Today', exact: true }).count()) +
  (await page.getByRole('button', { name: 'See all: Projects', exact: true }).count());

const onProjects = (page: Page): Promise<number> => page.getByRole('button', { name: 'New project', exact: true }).count();

const at = Math.floor(Date.now() / 1000);

const renamed = {
  id: 801,
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

test('a module turned off on one device leaves the other at once, and comes back with what changed meanwhile', async ({
  app,
  browser,
  screen,
  second,
}) => {
  const baseUrl = app.baseUrl ?? '';
  await routes(baseUrl, moduleRoutes);
  const escapes = await openFirst(browser, app);
  await second.open();
  await expect.poll(() => connected(baseUrl, 'A'), { timeout: 10000 }).toBe(1);
  await expect.poll(() => connected(baseUrl, 'B'), { timeout: 10000 }).toBe(1);
  await emit(baseUrl, [{ frame: { operation: 4, option: 'project', info: renamed } }]);
  await second.page.getByRole('tab', { name: 'Agenda', exact: true }).first().click();
  await second.page.getByRole('button', { name: 'Projects', exact: true }).first().click();
  await expect.poll(() => onProjects(second.page), { timeout: 10000 }).toBeGreaterThan(0);
  await expect.poll(() => second.page.getByRole('button', { name: /^Huerto, / }).count(), { timeout: 10000 }).toBe(1);

  await screen.getByRole('tab', 'Settings').first().click();
  await screen.getByRole('button', 'Modules. Choose what Argus does and follow each installation.').click();
  await screen.getByRole('button', 'Turn off: Productivity').click();
  await screen.getByText('Turn off', { exact: true }).last().click();

  await expect.poll(() => onProjects(second.page), { timeout: LIVE_MS }).toBe(0);
  await expect.poll(() => second.page.getByRole('tab', { name: 'Agenda', exact: true }).count()).toBe(0);
  await expect.poll(() => homeProductivity(second.page), { timeout: LIVE_MS }).toBe(0);

  await store(baseUrl, 'project', { ...renamed, name: 'Huerto comunitario' });

  await screen.getByText('Turn on', { exact: true }).first().click();
  await expect
    .poll(() => second.page.getByRole('tab', { name: 'Agenda', exact: true }).count(), { timeout: LIVE_MS })
    .toBeGreaterThan(0);
  await expect.poll(() => homeProductivity(second.page), { timeout: LIVE_MS }).toBe(4);
  await second.page.getByRole('tab', { name: 'Agenda', exact: true }).first().click();
  await second.page.getByRole('button', { name: 'Projects', exact: true }).first().click();
  await expect.poll(() => second.page.getByRole('button', { name: /^Huerto comunitario, / }).count(), { timeout: LIVE_MS }).toBe(1);
  await expect.poll(() => second.page.getByRole('button', { name: /^Huerto, / }).count()).toBe(0);

  expect(escapes).toEqual([]);
  expect(second.escapes).toEqual([]);
});
