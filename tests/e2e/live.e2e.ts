import { appendFileSync } from 'node:fs';
import type { Page } from 'playwright-core';
import type { DeviceFrame } from './support/fake-argus';
import { connected, control, emit, routes, store } from './support/harness';
import { expect, openFirst, test } from './support/devices';
import { environment } from './support/screens';
import { event, project, task, user } from './support/ui-map/data';

const LIVE_MS = 1000;

const OFFLINE_NOTICE_MS = 12000;

const at = Math.floor(Date.now() / 1000);

let auditId = 0;

const added = (table: string, row: Record<string, unknown>): DeviceFrame => ({
  frame: { operation: 4, option: table, info: row },
});

const removed = (table: string, id: number): DeviceFrame => ({
  frame: { operation: 5, option: table, info: { id, deletedAt: at + 60 } },
});

const changed = (
  table: string,
  recordId: number,
  changes: Record<string, { previous: unknown; current: unknown }>,
  scope: 'audit_log' | 'user_audit_log' = 'audit_log'
): DeviceFrame => {
  auditId += 1;
  return {
    frame: {
      operation: 6,
      option: scope,
      info: {
        id: auditId,
        userId: 1,
        recordId,
        tableName: table,
        changes,
        priority: 1,
        eventTimestamp: Date.now(),
        createdAt: at + 30,
      },
    },
  };
};

const resourceChanged = (domain: string, scope: string, ids: number[]): DeviceFrame => ({
  frame: { operation: 14, option: 'resource_changed', info: { domain, scope, ids } },
});

const camera = (id: number, name: string, patch: Record<string, unknown> = {}) => ({
  id,
  name,
  driver: 'tapo',
  icon: 'video',
  manufacturer: 'TP-Link',
  model: 'C210',
  ip: `192.168.1.${50 + id}`,
  port: 554,
  username: 'admin',
  cloudUsername: '',
  recordMode: 'events',
  privacyState: 'off',
  privacyObeyed: false,
  watchman: true,
  noAudio: false,
  retentionDays: 30,
  capabilities: [],
  config: {},
  isEnabled: true,
  isOnline: true,
  createdAt: at + id,
  updatedAt: at + id,
  ...patch,
});

const notification = (id: number, title: string, body: string) => ({
  id,
  userId: 1,
  type: 'system',
  title,
  body,
  data: {},
  isRead: false,
  readAt: null,
  createdAt: at + id - 900,
});

const pause = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

const READY_MS = 10000;

const ready = (page: Page, text: string): Promise<void> =>
  page.getByText(text, { exact: true }).first().waitFor({ state: 'visible', timeout: READY_MS });

const visibleOn = (page: Page, text: string): Promise<void> =>
  page.getByText(text, { exact: true }).first().waitFor({ state: 'visible', timeout: LIVE_MS });

const goneFrom = (page: Page, text: string): Promise<void> =>
  page.getByText(text, { exact: true }).first().waitFor({ state: 'hidden', timeout: LIVE_MS });

const recordTiming = (label: string, ms: number): void => {
  const target = process.env.ARGUS_E2E_TIMINGS;
  if (target) appendFileSync(target, `${label}\t${ms}\n`);
};

const timed = async (label: string, work: () => Promise<unknown>): Promise<number> => {
  const started = Date.now();
  await work();
  const elapsed = Date.now() - started;
  recordTiming(label, elapsed);
  return elapsed;
};

const openBoth = async (
  baseUrl: string,
  path: string,
  app: { open: (path?: string) => Promise<void> },
  second: { open: (path?: string) => Promise<void> }
): Promise<void> => {
  await app.open(path);
  await second.open(path);
  await expect.poll(() => connected(baseUrl, 'A'), { timeout: 10000 }).toBeGreaterThan(0);
  await expect.poll(() => connected(baseUrl, 'B'), { timeout: 10000 }).toBe(1);
};

test('an agenda event Argus creates, renames and deletes is on both devices within a second', async ({
  app,
  browser,
  screen,
  second,
}) => {
  const baseUrl = app.baseUrl ?? '';
  await store(baseUrl, 'calendar_event', event(700, 'Visita al huerto', at).row);
  const escapes = await openFirst(browser, app);
  await openBoth(baseUrl, '/agenda', app, second);
  await expect(screen.getByText('Visita al huerto', { exact: true }).first()).toBeVisible({
    timeout: 10000,
  });
  await ready(second.page, 'Visita al huerto');

  const dentist = event(701, 'Cita con el dentista', at, { createdAt: at, updatedAt: at }).row;
  const create = await timed('agenda event add', async () => {
    await emit(baseUrl, [added('calendar_event', dentist)]);
    await Promise.all([
      expect(screen.getByText('Cita con el dentista', { exact: true }).first()).toBeVisible({
        timeout: LIVE_MS,
      }),
      visibleOn(second.page, 'Cita con el dentista'),
    ]);
  });
  const rename = await timed('agenda event log', async () => {
    await emit(baseUrl, [
      changed('calendar_event', 701, {
        title: { previous: 'Cita con el dentista', current: 'Dentista, consultorio 4' },
      }),
    ]);
    await Promise.all([
      expect(screen.getByText('Dentista, consultorio 4', { exact: true }).first()).toBeVisible({
        timeout: LIVE_MS,
      }),
      visibleOn(second.page, 'Dentista, consultorio 4'),
      goneFrom(second.page, 'Cita con el dentista'),
    ]);
  });
  const remove = await timed('agenda event delete', async () => {
    await emit(baseUrl, [removed('calendar_event', 701)]);
    await Promise.all([
      expect(screen.getByText('Dentista, consultorio 4', { exact: true }).first()).toBeHidden({
        timeout: LIVE_MS,
      }),
      goneFrom(second.page, 'Dentista, consultorio 4'),
    ]);
  });
  expect(Math.max(create, rename, remove)).toBeLessThan(LIVE_MS);
  await visibleOn(second.page, 'Visita al huerto');

  expect(escapes).toEqual([]);
  expect(second.escapes).toEqual([]);
});

test('a task Argus adds, completes and deletes is on both devices within a second', async ({
  app,
  browser,
  screen,
  second,
}) => {
  const baseUrl = app.baseUrl ?? '';
  await store(baseUrl, 'project', project(900, 'Huerto').row);
  const escapes = await openFirst(browser, app);
  await openBoth(baseUrl, '/projects/900', app, second);
  await expect(screen.getByText('Huerto', { exact: true }).first()).toBeVisible({ timeout: 10000 });
  await ready(second.page, 'Huerto');

  const seeds = task(1600, 900, 'Comprar semillas', { createdAt: at, updatedAt: at }).row;
  const done = 'Mark «Comprar semillas» as to do';
  const create = await timed('task add', async () => {
    await emit(baseUrl, [added('project_task', seeds)]);
    await Promise.all([
      expect(screen.getByText('Comprar semillas', { exact: true }).first()).toBeVisible({
        timeout: LIVE_MS,
      }),
      visibleOn(second.page, 'Comprar semillas'),
    ]);
  });
  const complete = await timed('task log', async () => {
    await emit(baseUrl, [
      changed('project_task', 1600, { status: { previous: 'todo', current: 'done' } }),
    ]);
    await Promise.all([
      expect(screen.getByLabel(done).first()).toBeVisible({ timeout: LIVE_MS }),
      second.page
        .getByLabel(done, { exact: true })
        .first()
        .waitFor({ state: 'visible', timeout: LIVE_MS }),
    ]);
  });
  const remove = await timed('task delete', async () => {
    await emit(baseUrl, [removed('project_task', 1600)]);
    await Promise.all([
      expect(screen.getByText('Comprar semillas', { exact: true }).first()).toBeHidden({
        timeout: LIVE_MS,
      }),
      goneFrom(second.page, 'Comprar semillas'),
    ]);
  });
  expect(Math.max(create, complete, remove)).toBeLessThan(LIVE_MS);

  expect(escapes).toEqual([]);
  expect(second.escapes).toEqual([]);
});

test('a project Argus renames and deletes changes on both devices within a second', async ({
  app,
  browser,
  screen,
  second,
}) => {
  const baseUrl = app.baseUrl ?? '';
  await store(baseUrl, 'project', project(900, 'Huerto').row);
  await store(baseUrl, 'project', project(901, 'Mudanza').row);
  const escapes = await openFirst(browser, app);
  await openBoth(baseUrl, '/projects', app, second);
  await expect(screen.getByText('Huerto', { exact: true }).first()).toBeVisible({ timeout: 10000 });
  await ready(second.page, 'Huerto');

  const rename = await timed('project log', async () => {
    await emit(baseUrl, [
      changed('project', 900, { name: { previous: 'Huerto', current: 'Huerto urbano' } }),
    ]);
    await Promise.all([
      expect(screen.getByText('Huerto urbano', { exact: true }).first()).toBeVisible({
        timeout: LIVE_MS,
      }),
      visibleOn(second.page, 'Huerto urbano'),
      goneFrom(second.page, 'Huerto'),
    ]);
  });
  const remove = await timed('project delete', async () => {
    await emit(baseUrl, [removed('project', 900)]);
    await Promise.all([
      expect(screen.getByText('Huerto urbano', { exact: true }).first()).toBeHidden({
        timeout: LIVE_MS,
      }),
      goneFrom(second.page, 'Huerto urbano'),
    ]);
  });
  expect(Math.max(rename, remove)).toBeLessThan(LIVE_MS);
  await visibleOn(second.page, 'Mudanza');

  expect(escapes).toEqual([]);
  expect(second.escapes).toEqual([]);
});

test('a notification Argus sends and then marks read is on both devices within a second', async ({
  app,
  browser,
  screen,
  second,
}) => {
  const baseUrl = app.baseUrl ?? '';
  await store(
    baseUrl,
    'notification',
    notification(501, 'Package at the door', 'Left with the doorman')
  );
  const escapes = await openFirst(browser, app);
  await openBoth(baseUrl, '/notification', app, second);
  await expect(screen.getByText('Left with the doorman', { exact: true }).first()).toBeVisible({
    timeout: 10000,
  });
  await ready(second.page, 'Left with the doorman');
  const unread = (page: Page): Promise<number> =>
    page.getByRole('img', { name: 'Unread', exact: true }).count();
  await expect.poll(() => unread(second.page), { timeout: 10000 }).toBe(1);

  const create = await timed('notification add', async () => {
    await emit(baseUrl, [
      added('notification', notification(502, 'Water bill due', 'Due on Friday')),
    ]);
    await Promise.all([
      expect(screen.getByText('Due on Friday', { exact: true }).first()).toBeVisible({
        timeout: LIVE_MS,
      }),
      visibleOn(second.page, 'Due on Friday'),
    ]);
  });
  await expect.poll(() => unread(second.page), { timeout: LIVE_MS }).toBe(2);
  const read = await timed('notification log', async () => {
    await emit(baseUrl, [
      changed(
        'notification',
        501,
        {
          isRead: { previous: false, current: true },
          readAt: { previous: null, current: at + 30 },
        },
        'user_audit_log'
      ),
      changed(
        'notification',
        502,
        {
          isRead: { previous: false, current: true },
          readAt: { previous: null, current: at + 30 },
        },
        'user_audit_log'
      ),
    ]);
    await Promise.all([
      expect(screen.getByRole('img', 'Unread').first()).toBeHidden({ timeout: LIVE_MS }),
      expect.poll(() => unread(second.page), { timeout: LIVE_MS }).toBe(0),
    ]);
  });
  expect(Math.max(create, read)).toBeLessThan(LIVE_MS);

  expect(escapes).toEqual([]);
  expect(second.escapes).toEqual([]);
});

test('a camera going offline and coming back shows on both devices within a second', async ({
  app,
  browser,
  screen,
  second,
}) => {
  const baseUrl = app.baseUrl ?? '';
  await store(baseUrl, 'camera', camera(7, 'Patio'));
  const escapes = await openFirst(browser, app);
  await openBoth(baseUrl, '/cameras', app, second);
  await expect(screen.getByText('1 of 1 online', { exact: true }).first()).toBeVisible({
    timeout: 10000,
  });
  await ready(second.page, '1 of 1 online');

  const offline = await timed('camera log offline', async () => {
    await emit(baseUrl, [changed('camera', 7, { isOnline: { previous: true, current: false } })]);
    await Promise.all([
      expect(screen.getByText('0 of 1 online', { exact: true }).first()).toBeVisible({
        timeout: LIVE_MS,
      }),
      visibleOn(second.page, '0 of 1 online'),
    ]);
  });
  const online = await timed('camera log online', async () => {
    await emit(baseUrl, [changed('camera', 7, { isOnline: { previous: false, current: true } })]);
    await Promise.all([
      expect(screen.getByText('1 of 1 online', { exact: true }).first()).toBeVisible({
        timeout: LIVE_MS,
      }),
      visibleOn(second.page, '1 of 1 online'),
    ]);
  });
  expect(Math.max(offline, online)).toBeLessThan(LIVE_MS);

  expect(escapes).toEqual([]);
  expect(second.escapes).toEqual([]);
});

test('a member Argus renames, or a new one, is in People on both devices within a second', async ({
  app,
  browser,
  screen,
  second,
}) => {
  const baseUrl = app.baseUrl ?? '';
  await store(baseUrl, 'user', user(2, 'Luis', 'Paz', 'resident').row);
  const escapes = await openFirst(browser, app);
  await openBoth(baseUrl, '/people', app, second);
  await expect(screen.getByText('Luis Paz', { exact: true }).first()).toBeVisible({
    timeout: 10000,
  });
  await ready(second.page, 'Luis Paz');

  const rename = await timed('people log', async () => {
    await emit(baseUrl, [
      changed('user', 2, {
        name: { previous: 'Luis', current: 'Lucho' },
        updatedAt: { previous: at, current: at + 30 },
      }),
    ]);
    await Promise.all([
      expect(screen.getByText('Lucho Paz', { exact: true }).first()).toBeVisible({
        timeout: LIVE_MS,
      }),
      visibleOn(second.page, 'Lucho Paz'),
      goneFrom(second.page, 'Luis Paz'),
    ]);
  });
  const create = await timed('people add', async () => {
    await emit(baseUrl, [added('user', user(9, 'Lucía', 'Ramos', 'resident').row)]);
    await Promise.all([
      expect(screen.getByText('Lucía Ramos', { exact: true }).first()).toBeVisible({
        timeout: LIVE_MS,
      }),
      visibleOn(second.page, 'Lucía Ramos'),
    ]);
  });
  expect(Math.max(rename, create)).toBeLessThan(LIVE_MS);

  expect(escapes).toEqual([]);
  expect(second.escapes).toEqual([]);
});

test('the guard mode Argus sets is the mode both devices show within a second, over ResourceChanged', async ({
  app,
  browser,
  screen,
  second,
}) => {
  const baseUrl = app.baseUrl ?? '';
  await routes(baseUrl, [
    { method: 'GET', path: '/guard/environments', info: [environment('home')] },
    { method: 'GET', path: '/guard/episodes', info: { rows: [], nextBefore: null } },
    { method: 'GET', path: '/guard/expected-guests', info: [] },
    { method: 'GET', path: '/guard/cameras', info: [] },
  ]);
  const escapes = await openFirst(browser, app);
  await openBoth(baseUrl, '/security', app, second);
  await expect(screen.getByRole('heading', 'Home')).toBeVisible({ timeout: 10000 });
  await expect
    .poll(() => second.page.getByRole('heading', { name: 'Home', exact: true }).count(), {
      timeout: 10000,
    })
    .toBe(1);

  const mode = await timed('guard mode resource changed', async () => {
    await routes(baseUrl, [
      { method: 'GET', path: '/guard/environments', info: [environment('night')] },
    ]);
    await emit(baseUrl, [resourceChanged('guard', 'environments', [1])]);
    await Promise.all([
      expect(screen.getByRole('heading', 'Night')).toBeVisible({ timeout: LIVE_MS }),
      second.page
        .getByRole('heading', { name: 'Night', exact: true })
        .waitFor({ state: 'visible', timeout: LIVE_MS }),
    ]);
  });
  expect(mode).toBeLessThan(LIVE_MS);

  expect(escapes).toEqual([]);
  expect(second.escapes).toEqual([]);
});

test('a reload right after the first sync keeps every synced row', async ({
  app,
  browser,
  screen,
}) => {
  const baseUrl = app.baseUrl ?? '';
  await store(baseUrl, 'project', project(900, 'Huerto').row);
  const escapes = await openFirst(browser, app);
  await expect.poll(() => connected(baseUrl, 'A'), { timeout: 10000 }).toBe(1);
  await app.open('/projects');
  await expect(screen.getByText('Huerto', { exact: true }).first()).toBeVisible({ timeout: 8000 });

  expect(escapes).toEqual([]);
});

test('with the server down every synced screen paints its last data at once, and the offline notice waits 12 s', async ({
  app,
  browser,
  screen,
}) => {
  const baseUrl = app.baseUrl ?? '';
  await store(baseUrl, 'calendar_event', event(700, 'Visita al huerto', at).row);
  await store(baseUrl, 'project', project(900, 'Huerto').row);
  await store(baseUrl, 'user', user(2, 'Luis', 'Paz', 'resident').row);
  await store(baseUrl, 'camera', camera(7, 'Patio'));
  await store(
    baseUrl,
    'notification',
    notification(501, 'Package at the door', 'Left with the doorman')
  );
  const escapes = await openFirst(browser, app);
  await expect.poll(() => connected(baseUrl, 'A'), { timeout: 10000 }).toBe(1);
  await app.open('/projects');
  await expect(screen.getByText('Huerto', { exact: true }).first()).toBeVisible({ timeout: 10000 });

  await control(baseUrl, 'down?device=A&ms=600000');
  const screens: [string, string][] = [
    ['/agenda', 'Visita al huerto'],
    ['/projects', 'Huerto'],
    ['/people', 'Luis Paz'],
    ['/notification', 'Left with the doorman'],
    ['/cameras', '1 of 1 online'],
  ];
  for (const [path, text] of screens) {
    await app.open(path);
    const painted = await timed(`offline paint ${path}`, () =>
      expect(screen.getByText(text, { exact: true }).first()).toBeVisible({ timeout: LIVE_MS })
    );
    expect(painted).toBeLessThan(LIVE_MS);
  }
  expect(await connected(baseUrl, 'A')).toBe(0);

  await app.open('/agenda');
  const opened = Date.now();
  await expect(screen.getByText('Visita al huerto', { exact: true }).first()).toBeVisible({
    timeout: LIVE_MS,
  });
  await expect(screen.getByText('No connection to Argus', { exact: true }).first()).toBeHidden();
  await pause(OFFLINE_NOTICE_MS - (Date.now() - opened) - LIVE_MS);
  await expect(screen.getByText('No connection to Argus', { exact: true }).first()).toBeHidden();
  await expect(screen.getByText('No connection to Argus', { exact: true }).first()).toBeVisible({
    timeout: 3 * LIVE_MS,
  });
  recordTiming('offline notice', Date.now() - opened);

  expect(escapes).toEqual([]);
});
