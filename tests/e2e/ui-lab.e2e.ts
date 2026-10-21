import { existsSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import type { Browser } from '@e2e-dev/web';
import { unpairedDevice } from './support/seed';
import { installTauriShim } from './support/tauri-shim';
import { expect, test } from './support/devices';

const WIDTHS = [360, 768, 1280] as const;

const THEMES = ['light', 'dark'] as const;

const MODES = [
  { name: 'default', query: '' },
  { name: 'reduced', query: '&rm=1&rt=1' },
] as const;

const HEIGHT = 900;

const CHUNKS = 3;

const SHOT = { maxDiffPixels: 40, timeout: 15000 } as const;

const SNAPSHOTS = fileURLToPath(new URL('./ui-lab.e2e.ts-snapshots/', import.meta.url));

const UPDATING = process.env.ARGUS_E2E_UPDATE_SCREENS === '1';

const enableLab = (): void => {
  Reflect.set(globalThis, '__ARGUS_UI_LAB__', true);
  if (location.search.includes('rm=1')) return;
  const hide = (): void => {
    const style = document.createElement('style');
    style.textContent = 'canvas{visibility:hidden!important}';
    document.head.append(style);
  };
  if (document.head) hide();
  else document.addEventListener('DOMContentLoaded', hide);
};

const platformOf = async (browser: Browser): Promise<string> => {
  const agent = await browser.evaluate(() => navigator.userAgent);
  const major = /Chrome\/(\d+)/.exec(agent)?.[1] ?? 'unknown';
  return `${process.platform}-${process.arch}-chromium${major}`;
};

const platformRecorded = (platform: string): boolean =>
  existsSync(SNAPSHOTS) && readdirSync(SNAPSHOTS).some((file) => file.includes(`-${platform}-`));

const catalogueIds = (browser: Browser): Promise<string[]> =>
  browser.evaluate(() =>
    [...document.querySelectorAll('[data-testid^="ui-lab-entry-"]')].map((node) =>
      (node.getAttribute('data-testid') ?? '').replace('ui-lab-entry-', '')
    )
  );

const chunks = Array.from({ length: CHUNKS }, (_, index) => index);

for (const width of WIDTHS) {
  for (const theme of THEMES) {
    for (const chunk of chunks) {
      test(`ui-lab components, part ${chunk + 1} of ${CHUNKS}, look as recorded at ${width} px in ${theme}`, async ({
        app,
        browser,
        screen,
      }) => {
        await browser.setViewport({ width, height: HEIGHT });
        await browser.addInitScript(installTauriShim, unpairedDevice('A'));
        await browser.addInitScript(enableLab);
        await app.open('/ui-lab');
        await expect(screen.getByTestId('ui-lab-entry-button')).toBeVisible({ timeout: 15000 });
        const platform = await platformOf(browser);
        test.skip(
          !UPDATING && !platformRecorded(platform),
          `no ui-lab baseline for ${platform}: run \`bun run test:e2e:update-screens\` on this machine`
        );
        const components = (await catalogueIds(browser)).filter(
          (_, index) => index % CHUNKS === chunk
        );
        for (const component of components) {
          for (const mode of MODES) {
            await app.open(`/ui-lab?c=${component}&theme=${theme}${mode.query}`);
            const stage = screen.getByTestId('ui-lab-stage');
            await expect(stage).toBeVisible({ timeout: 15000 });
            await expect(stage).toHaveScreenshot(
              `${component}-${width}-${theme}-${mode.name}-${platform}.png`,
              SHOT
            );
          }
        }
      });
    }
  }
}
