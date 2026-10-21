import type { Browser } from '@e2e-dev/web';
import { unpairedDevice } from './support/seed';
import { installTauriShim } from './support/tauri-shim';
import { expect, test } from './support/devices';

const enableLab = (): void => {
  Reflect.set(globalThis, '__ARGUS_UI_LAB__', true);
};

const CLIPPED = [
  { component: 'section', block: 'case-grouped' },
  { component: 'media', block: 'case-tile-live' },
] as const;

const SMALL = [
  { component: 'check', block: 'case-toggle', role: 'checkbox' },
  { component: 'switch', block: 'case-toggle', role: 'switch' },
  { component: 'toast', block: 'case-error', role: 'button' },
  { component: 'notice', block: 'case-banner-attention', role: 'button' },
] as const;

const openLab = async (
  browser: Browser,
  open: (path: string) => Promise<unknown>,
  path: string
) => {
  await browser.setViewport({ width: 768, height: 900 });
  await browser.addInitScript(installTauriShim, unpairedDevice('A'));
  await browser.addInitScript(enableLab);
  await open(path);
};

for (const { component, block } of CLIPPED) {
  test(`the focus ring of a ${component} control draws inside its clipped container`, async ({
    app,
    browser,
    screen,
  }) => {
    await openLab(browser, (path) => app.open(path), `/ui-lab?c=${component}&theme=light`);
    await expect(screen.getByTestId(block)).toBeVisible({ timeout: 15000 });
    const ring = await browser.evaluate((testId: string) => {
      const target = document.querySelector(`[data-testid="${testId}"] [role="button"]`);
      if (!(target instanceof HTMLElement)) return 'missing';
      target.focus();
      const style = getComputedStyle(target);
      return `${style.outlineStyle} ${style.outlineOffset}`;
    }, block);
    expect(ring).toBe('solid -4px');
  });
}

for (const { component, block, role } of SMALL) {
  test(`a ${component} control drawn under 48 px takes a 48 px hit area`, async ({
    app,
    browser,
    screen,
  }) => {
    await openLab(browser, (path) => app.open(path), `/ui-lab?c=${component}&theme=light`);
    await expect(screen.getByTestId(block)).toBeVisible({ timeout: 15000 });
    const area = await browser.evaluate(
      ({ testId, kind }: { testId: string; kind: string }) => {
        const target = document.querySelector(`[data-testid="${testId}"] [role="${kind}"]`);
        if (!(target instanceof HTMLElement)) return 'missing';
        const after = getComputedStyle(target, '::after');
        const drawn = target.getBoundingClientRect().height;
        return drawn < 48 ? `${after.position} ${after.height}` : 'absolute 48px';
      },
      { testId: block, kind: role }
    );
    expect(area).toBe('absolute 48px');
  });
}
