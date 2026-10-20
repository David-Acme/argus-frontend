import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { chromium, type Page } from 'playwright-core';
import { cdpEndpoint } from './support/chromium';
import { control, NOT_LOOPBACK } from './support/harness';
import { ownerDevice } from './support/seed';
import { installTauriShim, type ShimSeed } from './support/tauri-shim';
import { expect, test } from './support/devices';

const PHONE = { width: 390, height: 844 };
const HOME_ID = '0123456789abcdef0123456789abcdef';
const RELAY_DOMAIN = 'argus-tunnel.lynk.page';
const LAN_HOST = 'argus.e2e';
const SHOTS = process.env.ARGUS_E2E_ROUTE_SHOTS ?? '';
const SETTLE_MS = 600;

interface RouteCase {
  name: string;
  remote: boolean;
  cut: Record<string, string>;
  path: string;
  text: string;
  banner: boolean;
}

const CASES: RouteCase[] = [
  { name: 'home', remote: true, cut: {}, path: '/profile', text: 'Conectado en casa', banner: false },
  {
    name: 'cloud',
    remote: true,
    cut: { [LAN_HOST]: 'connect' },
    path: '/profile',
    text: 'Conectado por la nube',
    banner: false,
  },
  {
    name: 'unreachable',
    remote: true,
    cut: { [LAN_HOST]: 'connect', [RELAY_DOMAIN]: 'tls-peer-closed' },
    path: '/',
    text: 'No puedo conectar con Argus en casa',
    banner: true,
  },
  {
    name: 'remote-unavailable',
    remote: true,
    cut: { [LAN_HOST]: 'connect', [RELAY_DOMAIN]: 'connect' },
    path: '/',
    text: 'No encuentro a Argus',
    banner: true,
  },
];

const expectClearOfBanner = async (page: Page, text: string): Promise<void> => {
  const bannerBox = await page.getByRole('alert').filter({ hasText: text }).boundingBox();
  const firstControlBox = await page.evaluate(() => {
    const candidates = [...document.querySelectorAll<HTMLElement>('input, button, [role="button"], [role="textbox"]')];
    const first = candidates.find((element) => !element.closest('[role="alert"]') && element.getBoundingClientRect().height > 0);
    if (!first) return null;
    const { x, y, width, height } = first.getBoundingClientRect();
    return { x, y, width, height };
  });
  if (!bannerBox || !firstControlBox) throw new Error('the banner or the first control has no box');
  const overlaps =
    firstControlBox.x < bannerBox.x + bannerBox.width &&
    firstControlBox.x + firstControlBox.width > bannerBox.x &&
    firstControlBox.y < bannerBox.y + bannerBox.height &&
    firstControlBox.y + firstControlBox.height > bannerBox.y;
  expect(overlaps).toBe(false);
};

const seedFor = (routeCase: RouteCase): ShimSeed => {
  const owner = ownerDevice('A');
  const remote: Record<string, string> = routeCase.remote
    ? { 'net.remoteHomeId': HOME_ID, 'net.remoteDomain': RELAY_DOMAIN }
    : {};
  return {
    device: owner.device,
    secure: { ...owner.secure, ...remote },
    local: {
      ...owner.local,
      'argus-storage:app.language': 'es',
      __e2e_unreachable__: JSON.stringify(routeCase.cut),
    },
  };
};

for (const routeCase of CASES) {
  test(`the route status reads "${routeCase.text}" at phone width`, async ({ app }) => {
    const baseUrl = app.baseUrl ?? '';
    await control(baseUrl, 'reset');
    const connection = await chromium.connectOverCDP(await cdpEndpoint());
    const context = await connection.newContext({ viewport: PHONE });
    try {
      await context.route(NOT_LOOPBACK, (route) => route.abort());
      await context.addInitScript(installTauriShim, seedFor(routeCase));
      const page = await context.newPage();
      await page.goto(new URL(routeCase.path, baseUrl).toString());
      await expect.poll(() => page.getByText(routeCase.text).count(), { timeout: 15000 }).toBe(1);
      if (routeCase.banner) await expectClearOfBanner(page, routeCase.text);
      if (SHOTS) {
        await page.getByText(routeCase.text).scrollIntoViewIfNeeded();
        await page.waitForTimeout(SETTLE_MS);
        mkdirSync(SHOTS, { recursive: true });
        await page.screenshot({ path: join(SHOTS, `route-${routeCase.name}-phone.png`) });
      }
    } finally {
      await context.close();
      await connection.close();
    }
  });
}
