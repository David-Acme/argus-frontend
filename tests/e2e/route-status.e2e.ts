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
  shown: boolean;
}

const CASES: RouteCase[] = [
  {
    name: 'home',
    remote: true,
    cut: {},
    path: '/profile/sessions',
    text: 'Conectado en casa',
    banner: false,
    shown: false,
  },
  {
    name: 'cloud',
    remote: true,
    cut: { [LAN_HOST]: 'connect' },
    path: '/profile/sessions',
    text: 'Conectado por la nube',
    banner: false,
    shown: false,
  },
  {
    name: 'unreachable',
    remote: true,
    cut: { [LAN_HOST]: 'connect', [RELAY_DOMAIN]: 'tls-peer-closed' },
    path: '/',
    text: 'No puedo conectar con Argus en casa',
    banner: true,
    shown: true,
  },
  {
    name: 'remote-unavailable',
    remote: true,
    cut: { [LAN_HOST]: 'connect', [RELAY_DOMAIN]: 'connect' },
    path: '/',
    text: 'No encuentro a Argus',
    banner: true,
    shown: true,
  },
];

const expectDismissibleNotice = async (page: Page, text: string): Promise<void> => {
  const pill = page.getByRole('button', { name: text, exact: true });
  await expect.poll(() => pill.count(), { timeout: 5000 }).toBe(1);
  await pill.click();
  await expect
    .poll(() => page.getByRole('button', { name: new RegExp(`^${text}\\. `) }).count(), {
      timeout: 5000,
    })
    .toBe(1);
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
  test(`the route status ${routeCase.shown ? 'reads' : 'never reads'} "${routeCase.text}" at phone width`, async ({
    app,
  }) => {
    const baseUrl = app.baseUrl ?? '';
    await control(baseUrl, 'reset');
    const connection = await chromium.connectOverCDP(await cdpEndpoint());
    const context = await connection.newContext({ viewport: PHONE });
    try {
      await context.route(NOT_LOOPBACK, (route) => route.abort());
      await context.addInitScript(installTauriShim, seedFor(routeCase));
      const page = await context.newPage();
      await page.goto(new URL(routeCase.path, baseUrl).toString());
      if (!routeCase.shown) {
        await expect
          .poll(() => page.getByText(/^Argus en /).count(), { timeout: 30000 })
          .toBeGreaterThan(0);
        expect(await page.getByText(routeCase.text).count()).toBe(0);
        return;
      }
      await expect.poll(() => page.getByText(routeCase.text).count(), { timeout: 30000 }).toBe(1);
      if (routeCase.banner) await expectDismissibleNotice(page, routeCase.text);
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
