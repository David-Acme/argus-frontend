import { chromium, type Page } from 'playwright-core';
import { cdpEndpoint } from './support/chromium';
import { NOT_LOOPBACK, connected, control, store } from './support/harness';
import { installTauriShim } from './support/tauri-shim';
import { ownerDevice } from './support/seed';
import { expect, test } from './support/devices';

const at = Math.floor(Date.now() / 1000);

const LATENCY_MS = 1200;

const visit = {
  id: 710,
  ownerId: 1,
  createdBy: 1,
  projectId: null,
  title: 'Cita del enlace',
  description: '',
  location: '',
  color: 'blue',
  startsAt: at,
  endsAt: null,
  isAllDay: false,
  recurrenceRule: null,
  createdAt: at,
  updatedAt: at,
  deletedAt: null,
};

const openCold = async (baseUrl: string, path: string, run: (page: Page) => Promise<void>): Promise<void> => {
  const connection = await chromium.connectOverCDP(await cdpEndpoint());
  const context = await connection.newContext({ viewport: { width: 1280, height: 800 } });
  try {
    await context.route(NOT_LOOPBACK, (route) => route.abort());
    await context.route('**/__api/**', async (route) => {
      if (route.request().method() === 'GET') await new Promise((resolve) => setTimeout(resolve, LATENCY_MS));
      await route.continue().catch(() => undefined);
    });
    await context.addInitScript(installTauriShim, ownerDevice('A'));
    const page = await context.newPage();
    await page.goto(new URL(path, baseUrl).toString());
    await run(page);
  } finally {
    await context.close();
    await connection.close();
  }
};

test('a cold deep link to a module screen lands there and stays', async ({ app }) => {
  const baseUrl = app.baseUrl ?? '';
  await control(baseUrl, 'reset');
  await store(baseUrl, 'calendar_event', visit);
  await openCold(baseUrl, '/agenda', async (page) => {
    await expect.poll(() => connected(baseUrl, 'A'), { timeout: 10000 }).toBe(1);
    await expect.poll(() => page.getByText('Cita del enlace').count(), { timeout: 10000 }).toBeGreaterThan(0);
    await page.waitForTimeout(2000);
    expect(new URL(page.url()).pathname).toBe('/agenda');
  });
});

test('a cold deep link to a camera opens that camera', async ({ app }) => {
  const baseUrl = app.baseUrl ?? '';
  await control(baseUrl, 'reset');
  await store(baseUrl, 'camera', {
    id: 3,
    name: 'Patio trasero',
    driver: 'tapo',
    icon: 'video',
    manufacturer: 'TP-Link',
    model: 'C210',
    ip: '192.168.1.53',
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
    config: { catalogId: 'tapo-c210', streamPath: '', subStreamPath: '', homePreset: '1', activeLook: false, followIntruders: false, noAimSectors: [], retentionIncident: false },
    isEnabled: true,
    isOnline: true,
    createdAt: at,
    updatedAt: at,
  });
  await openCold(baseUrl, '/cameras/3', async (page) => {
    await expect.poll(() => connected(baseUrl, 'A'), { timeout: 10000 }).toBe(1);
    await page.waitForTimeout(4000);
    expect(new URL(page.url()).pathname).toBe('/cameras/3');
  });
});

test('a deep link whose context arrives after the wait is restored once it arrives', async ({ app }) => {
  const baseUrl = app.baseUrl ?? '';
  await control(baseUrl, 'reset');
  await store(baseUrl, 'calendar_event', visit);
  await control(baseUrl, 'refuse?device=A&ms=5000');
  await openCold(baseUrl, '/agenda', async (page) => {
    await expect.poll(() => new URL(page.url()).pathname, { timeout: 6000 }).toBe('/');
    await expect.poll(() => connected(baseUrl, 'A'), { timeout: 20000 }).toBe(1);
    await expect.poll(() => new URL(page.url()).pathname, { timeout: 10000 }).toBe('/agenda');
    await page.waitForTimeout(3000);
    expect(new URL(page.url()).pathname).toBe('/agenda');
  });
});
