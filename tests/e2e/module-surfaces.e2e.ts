import { existsSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import type { Browser } from '@e2e-dev/web';
import { connected, patchContext, routes, store } from './support/harness';
import { installFixedClock, FIXED_NOW } from './support/clock';
import { installReducedMotion } from './support/motion';
import { populated, seededProject } from './support/screens';
import { expect, openFirst, test } from './support/devices';

const WIDTHS = [
  { name: 'phone', width: 390, height: 844 },
  { name: 'desktop', width: 1280, height: 800 },
] as const;

const BASELINE = [
  'profile.read',
  'sessions.manage',
  'privacy.own',
  'notifications.read',
  'notifications.register',
  'calls.join',
  'heartbeat.read',
  'modules.read',
  'safety.panic',
  'safety.read',
  'safety.respond',
  'reminders.read',
  'reminders.write',
  'messages.relay',
];

const CASES = [
  { name: 'owner-all-modules', patch: null },
  {
    name: 'guest-core-only',
    patch: {
      role: 'guest',
      roleActive: true,
      capabilities: [...BASELINE, 'modules.request', 'assistant.voice'],
      modules: [],
    },
  },
  {
    name: 'guard-inactive',
    patch: {
      role: 'guard',
      roleActive: false,
      roles: [{ id: 'guard', module: 'surveillance', active: false }],
      capabilities: BASELINE,
    },
  },
] as const;

const SHOT = { maxDiffPixels: 40, timeout: 15000 } as const;

const SNAPSHOTS = fileURLToPath(new URL('./module-surfaces.e2e.ts-snapshots/', import.meta.url));

const UPDATING = process.env.ARGUS_E2E_UPDATE_SCREENS === '1';

const platformOf = async (browser: Browser): Promise<string> => {
  const agent = await browser.evaluate(() => navigator.userAgent);
  const major = /Chrome\/(\d+)/.exec(agent)?.[1] ?? 'unknown';
  return `${process.platform}-${process.arch}-chromium${major}`;
};

const platformRecorded = (platform: string): boolean =>
  existsSync(SNAPSHOTS) && readdirSync(SNAPSHOTS).some((file) => file.includes(`-${platform}-`));

for (const size of WIDTHS)
  for (const item of CASES)
    test(`${item.name} at ${size.name} width: the surfaces of its modules and nothing else`, async ({
      app,
      browser,
      screen,
    }) => {
      const baseUrl = app.baseUrl ?? '';
      await routes(baseUrl, populated);
      await store(baseUrl, 'project', seededProject);
      if (item.patch) await patchContext(baseUrl, item.patch);
      await browser.setViewport({ width: size.width, height: size.height });
      await browser.addInitScript(installFixedClock, FIXED_NOW);
      await browser.addInitScript(installReducedMotion, null);
      await openFirst(browser, app);
      await expect.poll(() => connected(baseUrl, 'A'), { timeout: 10000 }).toBe(1);
      const platform = await platformOf(browser);
      test.skip(
        !UPDATING && !platformRecorded(platform),
        `no visual baseline for ${platform}: run \`bun run test:e2e:update-screens\` on this machine`
      );
      if (item.name === 'owner-all-modules') {
        await expect(screen.getByRole('tab', 'Security').first()).toBeVisible({ timeout: 10000 });
        await expect(screen.getByRole('tab', 'Agenda').first()).toBeVisible();
      } else {
        await expect(screen.getByRole('tab', 'Security')).toBeHidden({ timeout: 10000 });
        await expect(screen.getByRole('tab', 'Agenda')).toBeHidden();
        await expect(screen.getByText('Modules', { exact: true })).toBeHidden();
      }
      await expect(screen).toHaveScreenshot(
        `inicio-${item.name}-${size.name}-${platform}.png`,
        SHOT
      );
      if (size.name === 'phone') {
        await screen.getByRole('tab', 'All').first().click();
        await expect(screen.getByRole('heading', 'General')).toBeVisible({ timeout: 10000 });
        await expect(screen).toHaveScreenshot(
          `sheet-${item.name}-${size.name}-${platform}.png`,
          SHOT
        );
      }
    });
