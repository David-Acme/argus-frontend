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

for (const { component, block } of CLIPPED) {
  test(`the focus ring of a ${component} control draws inside its clipped container`, async ({
    app,
    browser,
    screen,
  }) => {
    await browser.setViewport({ width: 768, height: 900 });
    await browser.addInitScript(installTauriShim, unpairedDevice('A'));
    await browser.addInitScript(enableLab);
    await app.open(`/ui-lab?c=${component}&theme=light`);
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
