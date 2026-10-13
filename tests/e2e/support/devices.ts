import { test as base, type Browser as WebBrowser } from '@e2e-dev/web';
import { chromium, type Browser, type BrowserContext, type Page } from 'playwright-core';
import { cdpEndpoint } from './chromium';
import { control, NOT_LOOPBACK } from './harness';
import { installTauriShim } from './tauri-shim';
import { ownerDevice } from './seed';

export type SecondDevice = {
  page: Page;
  context: BrowserContext;
  escapes: string[];
  open: (path?: string) => Promise<void>;
};

export const test = base.extend<{ second: SecondDevice }>({
  second: async ({ app }, use) => {
    await control(app.baseUrl ?? '', 'reset');
    const connection: Browser = await chromium.connectOverCDP(await cdpEndpoint());
    const context = await connection.newContext({ viewport: { width: 1280, height: 800 } });
    const escapes: string[] = [];
    await context.route(NOT_LOOPBACK, (route) => {
      escapes.push(route.request().url());
      return route.abort();
    });
    await context.addInitScript(installTauriShim, ownerDevice('B'));
    const page = await context.newPage();
    const open = async (path = '/'): Promise<void> => {
      await page.goto(new URL(path, app.baseUrl ?? 'http://127.0.0.1').toString());
    };
    await use({ page, context, escapes, open });
    await context.close();
    await connection.close();
  },
});

export { expect } from 'e2e';

export const openFirst = async (browser: WebBrowser, app: { open: (path?: string) => Promise<void> }): Promise<string[]> => {
  const escapes: string[] = [];
  await browser.route(NOT_LOOPBACK, (route) => {
    escapes.push(route.request.url);
    return route.abort();
  });
  await browser.addInitScript(installTauriShim, ownerDevice('A'));
  await app.open('/');
  return escapes;
};
