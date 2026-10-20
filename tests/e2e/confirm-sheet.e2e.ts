import { chromium } from 'playwright-core';
import { cdpEndpoint } from './support/chromium';
import { NOT_LOOPBACK, connected, control, routes } from './support/harness';
import { installTauriShim } from './support/tauri-shim';
import { ownerDevice } from './support/seed';
import { populated } from './support/screens';
import { expect, test } from './support/devices';

const PHONE = { width: 360, height: 800 };

test('signing out everywhere waits for the confirmation, and the sheet keeps Cancel on screen', async ({ app }) => {
  const baseUrl = app.baseUrl ?? '';
  await control(baseUrl, 'reset');
  await routes(baseUrl, populated);
  const connection = await chromium.connectOverCDP(await cdpEndpoint());
  const context = await connection.newContext({ viewport: PHONE });
  try {
    await context.route(NOT_LOOPBACK, (route) => route.abort());
    const owner = ownerDevice('A');
    await context.addInitScript(installTauriShim, { ...owner, local: { ...owner.local, 'argus-storage:app.language': 'es' } });
    const page = await context.newPage();
    await page.goto(new URL('/profile', baseUrl).toString());
    await expect.poll(() => connected(baseUrl, 'A'), { timeout: 10000 }).toBe(1);

    const everywhere = page.getByRole('button', { name: 'Cerrar sesión en todos los dispositivos', exact: true }).first();
    await expect.poll(() => everywhere.count(), { timeout: 10000 }).toBeGreaterThan(0);
    await page.waitForTimeout(1000);
    await everywhere.click();
    const cancel = page.getByRole('button', { name: 'Cancelar', exact: true }).last();
    await expect.poll(() => cancel.isVisible(), { timeout: 5000 }).toBe(true);

    await page.waitForTimeout(500);
    const disabled = await page.evaluate(() =>
      [...document.querySelectorAll('[aria-disabled="true"]')].map((element) => element.textContent ?? '')
    );
    expect(disabled.filter((label) => label.includes('Cerrar sesión en todos los dispositivos'))).toEqual([]);
    const box = await cancel.boundingBox();
    if (!box) throw new Error('Cancel has no box');
    expect(box.x).toBeGreaterThanOrEqual(0);
    expect(box.x + box.width).toBeLessThanOrEqual(PHONE.width);
  } finally {
    await context.close();
    await connection.close();
  }
});
