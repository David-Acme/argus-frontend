import { test as base } from '@e2e-dev/web';
import { chromium, type Browser, type BrowserContext, type Page } from 'playwright-core';
import { cdpEndpoint } from './chromium';
import { NOT_LOOPBACK } from './harness';
import { installTauriShim } from './tauri-shim';
import { ownerDevice } from './seed';

export type SecondDevice = {
  page: Page;
  context: BrowserContext;
  escapes: string[];
};

export const test = base.extend<{ second: SecondDevice }>({
  second: async ({ app }, use) => {
    const connection: Browser = await chromium.connectOverCDP(await cdpEndpoint());
    const context = await connection.newContext({ viewport: { width: 1280, height: 800 } });
    const escapes: string[] = [];
    await context.route(NOT_LOOPBACK, (route) => {
      escapes.push(route.request().url());
      return route.abort();
    });
    await context.addInitScript(installTauriShim, ownerDevice('B'));
    const page = await context.newPage();
    await page.goto(app.baseUrl ?? '/');
    await use({ page, context, escapes });
    await context.close();
    await connection.close();
  },
});

export { expect } from 'e2e';
