import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from './support/devices';
import { closeBrowser, ENABLED, ENGINE, SKIP_REASON } from './support/ui-map/capture';
import { runScreen, type ScreenSpec } from './support/ui-map/scenario';
import { AUTH } from './ui-map/auth';
import { HOME } from './ui-map/home';
import { PRODUCTIVITY_SCREENS } from './ui-map/productivity';
import { SURVEILLANCE_SCREENS } from './ui-map/surveillance';
import { HOUSEHOLD_SCREENS } from './ui-map/household';

const SCREENS: readonly ScreenSpec[] = [...AUTH, ...HOME, ...PRODUCTIVITY_SCREENS, ...SURVEILLANCE_SCREENS, ...HOUSEHOLD_SCREENS];

const ONLY_SCREEN = process.env.ARGUS_UI_MAP_SCREEN ?? '';

const ONLY_STATE = process.env.ARGUS_UI_MAP_STATE ?? '';

const report = (screen: string, failures: readonly string[]): void => {
  const folder = join(process.env.ARGUS_UI_MAP_DIR ?? '', ENGINE === 'webkit' ? 'webkit' : 'web', 'failures');
  mkdirSync(folder, { recursive: true });
  writeFileSync(join(folder, `${screen}.json`), `${JSON.stringify(failures, null, 1)}\n`);
};

for (const screen of SCREENS) {
  const skip = !ENABLED ? SKIP_REASON : ONLY_SCREEN && !ONLY_SCREEN.split(',').includes(screen.screen) ? 'not selected' : false;
  test(`ui map: ${screen.screen}`, { timeout: 3600000, skip }, async ({ app }) => {
    const failures = await runScreen(app.baseUrl ?? '', screen, ONLY_STATE || undefined);
    report(screen.screen, failures);
    await closeBrowser();
  });
}
