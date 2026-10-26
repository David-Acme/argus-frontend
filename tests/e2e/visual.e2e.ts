import { existsSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import type { Browser } from '@e2e-dev/web';
import { connected, routes, store } from './support/harness';
import { installFixedClock, FIXED_NOW } from './support/clock';
import { populated, seededProject } from './support/screens';
import { unpairedDevice } from './support/seed';
import { expect, openFirst, test } from './support/devices';

const WIDTHS = [
  { name: 'phone', width: 390, height: 844 },
  { name: 'tablet', width: 834, height: 1112 },
  { name: 'desktop', width: 1280, height: 800 },
] as const;

const SHOT = { maxDiffPixels: 40, timeout: 15000 } as const;

const HERO = 'Argus greets you with its modules: Security, Productivity and Agronomy, coming soon.';

const INTRO_MS = 3000;

const TOOLTIP_MS = 600;

const settle = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

const SNAPSHOTS = fileURLToPath(new URL('./visual.e2e.ts-snapshots/', import.meta.url));

const UPDATING = process.env.ARGUS_E2E_UPDATE_SCREENS === '1';

const platformOf = async (browser: Browser): Promise<string> => {
  const agent = await browser.evaluate(() => navigator.userAgent);
  const major = /Chrome\/(\d+)/.exec(agent)?.[1] ?? 'unknown';
  return `${process.platform}-${process.arch}-chromium${major}`;
};

const platformRecorded = (platform: string): boolean =>
  existsSync(SNAPSHOTS) && readdirSync(SNAPSHOTS).some((file) => file.includes(`-${platform}-`));

const missingBaseline = (platform: string): string =>
  `no visual baseline for ${platform}: run \`bun run test:e2e:update-screens\` on this machine to record its set`;

for (const size of WIDTHS) {
  test(`the main screens look as recorded at ${size.name} width`, async ({ app, browser, screen }) => {
    const baseUrl = app.baseUrl ?? '';
    await routes(baseUrl, populated);
    await store(baseUrl, 'project', seededProject);
    await browser.setViewport({ width: size.width, height: size.height });
    await browser.addInitScript(installFixedClock, FIXED_NOW);
    await openFirst(browser, app);
    await expect.poll(() => connected(baseUrl, 'A'), { timeout: 10000 }).toBe(1);
    await expect(screen.getByText(/Good (morning|afternoon|evening), Ana/).first()).toBeVisible({ timeout: 10000 });
    const platform = await platformOf(browser);
    test.skip(!UPDATING && !platformRecorded(platform), missingBaseline(platform));
    await expect(screen.getByText('Now', { exact: true }).first()).toBeVisible();
    await expect(screen).toHaveScreenshot(`home-${size.name}-${platform}.png`, SHOT);

    await screen.getByRole('button', 'Projects').first().click();
    await expect(screen.getByRole('button', 'New project').first()).toBeVisible({ timeout: 10000 });
    await browser.mouse.move(size.width - 2, size.height - 2);
    await settle(TOOLTIP_MS);
    await expect(screen).toHaveScreenshot(`projects-${size.name}-${platform}.png`, SHOT);

    await screen.getByRole('button', 'Home').first().click();
    await screen.getByRole('button', 'Open security').click();
    await expect(screen.getByText('Unknown person', { exact: true })).toBeVisible({ timeout: 10000 });
    await browser.mouse.move(size.width - 2, size.height - 2);
    await settle(TOOLTIP_MS);
    await expect(screen).toHaveScreenshot(`security-${size.name}-${platform}.png`, SHOT);
  });

  test(`the welcome looks as recorded at ${size.name} width`, async ({ app, browser, screen }) => {
    await browser.setViewport({ width: size.width, height: size.height });
    await browser.addInitScript(installFixedClock, FIXED_NOW);
    await openFirst(browser, app, unpairedDevice('A'));
    await expect(screen.getByRole('heading', 'Hi, I am Argus')).toBeVisible({ timeout: 10000 });
    const platform = await platformOf(browser);
    test.skip(!UPDATING && !platformRecorded(platform), missingBaseline(platform));
    await expect(screen.getByText('Get started', { exact: true })).toBeVisible({ timeout: 15000 });
    await settle(INTRO_MS);
    await expect(screen).toHaveScreenshot(`welcome-${size.name}-${platform}.png`, {
      ...SHOT,
      mask: [screen.getByRole('button', HERO)],
    });
  });
}
