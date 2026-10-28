import { readFileSync } from 'node:fs';
import { extname, join, normalize, resolve, sep } from 'node:path';
import { chromium, type Page } from 'playwright-core';
import { budgetFailures, measureBundle, parseBundleBaseline } from './lib/bundle-budget';
import { welcome as welcomeEn } from '../src/core/locales/en/screens/welcome';
import { welcome as welcomeEs } from '../src/core/locales/es/screens/welcome';

const ROOT = join(import.meta.dir, '..');
const DIST = join(ROOT, 'dist');
const DIST_ROOT = resolve(DIST);
const CHROMIUM = process.env.ARGUS_CHROMIUM ?? '/usr/bin/chromium';
const BOUNDARY_TEXT = 'Something went wrong';
const EXPORT_TIMEOUT_MS = 300000;
const READY_TIMEOUT_MS = 20000;
const SETTLE_MS = 2500;

type AllowedConsoleError = { match: RegExp; why: string };

const ALLOWED: readonly AllowedConsoleError[] = [];

const BUNDLE_BASELINE = join(ROOT, 'scripts', 'lib', 'bundle-baseline.txt');

const checkBudget = (): boolean => {
  const sizes = measureBundle(DIST);
  const failures = budgetFailures(
    parseBundleBaseline(readFileSync(BUNDLE_BASELINE, 'utf8')),
    sizes
  );
  for (const failure of failures) console.error(`probe-web-bundle: ${failure}`);
  console.log(`probe-web-bundle: entry chunk ${sizes.entryBytes} B, dist/ ${sizes.distBytes} B`);
  return failures.length === 0;
};

const runExport = async (): Promise<void> => {
  const exported = Bun.spawn(['bun', 'run', 'web:build'], {
    cwd: ROOT,
    stdout: 'pipe',
    stderr: 'pipe',
  });
  const kill = setTimeout(() => exported.kill(), EXPORT_TIMEOUT_MS);
  const [stdout, stderr] = await Promise.all([
    new Response(exported.stdout).text(),
    new Response(exported.stderr).text(),
  ]);
  const exitCode = await exported.exited;
  clearTimeout(kill);
  if (exitCode !== 0) {
    const tail = `${stdout}${stderr}`.trim().split('\n').slice(-15).join('\n');
    throw new Error(`web:build failed with ${exitCode}\n${tail}`);
  }
};

const contentPolicy = (): string => {
  const config = JSON.parse(readFileSync(join(ROOT, 'src-tauri', 'tauri.conf.json'), 'utf8')) as {
    app?: { security?: { csp?: Record<string, string> } };
  };
  const csp = config.app?.security?.csp;
  if (!csp) throw new Error('tauri.conf.json declares no app.security.csp');
  return Object.entries(csp)
    .map(([directive, value]) => `${directive} ${value}`)
    .join('; ');
};

const bundleServer = (csp: string) =>
  Bun.serve({
    hostname: '127.0.0.1',
    port: 0,
    async fetch(request) {
      const notFound = () =>
        new Response('Not found', {
          status: 404,
          headers: { 'Content-Security-Policy': csp },
        });
      const path = normalize(decodeURIComponent(new URL(request.url).pathname));
      const target = extname(path) ? resolve(DIST_ROOT, `.${path}`) : join(DIST_ROOT, 'index.html');
      if (target !== DIST_ROOT && !target.startsWith(`${DIST_ROOT}${sep}`)) return notFound();
      const file = Bun.file(target);
      if (!(await file.exists())) return notFound();
      return new Response(file, {
        headers: { 'Content-Security-Policy': csp },
      });
    },
  });

const WELCOME_LOCALES = [welcomeEn, welcomeEs] as const;

const welcomeFailures = async (page: Page): Promise<string[]> => {
  const tree = await page.locator('#root').ariaSnapshot();
  const locale = WELCOME_LOCALES.find((strings) => tree.includes(strings.title));
  if (!locale)
    return [`the welcome screen exposes no heading named by its title: ${excerpt(tree)}`];
  const failures: string[] = [];
  const heading = await page
    .getByRole('heading', { name: locale.title, level: 1, exact: true })
    .count();
  if (heading !== 1)
    failures.push(
      `the welcome screen has ${heading} level-one headings named by its title, not one`
    );
  const estela = await page.getByRole('img', { name: locale['estela-label'], exact: true }).count();
  if (estela !== 1)
    failures.push(`the welcome screen has ${estela} images named for Estela, not one`);
  const start = await page.getByRole('button', { name: locale.cta, exact: true }).count();
  if (start !== 1)
    failures.push(`the welcome screen has ${start} buttons named by its call to action, not one`);
  return failures;
};

const excerpt = (text: string): string => text.replace(/\s+/g, ' ').trim().slice(0, 160);

const main = async (): Promise<void> => {
  const startedAt = Date.now();
  await runExport();
  const exportedAt = Date.now();
  if (!checkBudget()) {
    process.exitCode = 1;
    return;
  }
  const server = bundleServer(contentPolicy());
  const browser = await chromium.launch({ executablePath: CHROMIUM });
  try {
    const page = await browser.newPage();
    const consoleErrors: string[] = [];
    page.on('console', (message) => {
      if (message.type() === 'error') consoleErrors.push(message.text());
    });
    page.on('pageerror', (error) => consoleErrors.push(String(error)));

    await page.goto(`http://127.0.0.1:${server.port}/`, { waitUntil: 'load' });
    let rendered = '';
    try {
      await page.waitForFunction(
        () => (document.getElementById('root')?.innerText ?? '').trim().length > 0,
        undefined,
        { timeout: READY_TIMEOUT_MS }
      );
    } catch {
      rendered = '';
    }
    await page.waitForTimeout(SETTLE_MS);
    rendered =
      rendered || (await page.evaluate(() => document.getElementById('root')?.innerText ?? ''));

    const unexpected = consoleErrors.filter(
      (text) => !ALLOWED.some((allowed) => allowed.match.test(text))
    );
    const failures: string[] = [];
    if (rendered.trim().length === 0) {
      failures.push(`the root never rendered within ${READY_TIMEOUT_MS} ms`);
    }
    if (rendered.includes(BOUNDARY_TEXT)) {
      failures.push(`the root shows the error boundary: ${excerpt(rendered)}`);
    }
    for (const text of unexpected) failures.push(`console.error: ${excerpt(text)}`);
    if (failures.length === 0) failures.push(...(await welcomeFailures(page)));

    if (failures.length > 0) {
      for (const failure of failures) console.error(`probe-web-bundle: ${failure}`);
      process.exitCode = 1;
      return;
    }
    for (const text of consoleErrors) {
      const allowed = ALLOWED.find((entry) => entry.match.test(text));
      console.log(`probe-web-bundle: allowed: ${excerpt(text)} (${allowed?.why ?? ''})`);
    }
    const exportSeconds = ((exportedAt - startedAt) / 1000).toFixed(1);
    const probeSeconds = ((Date.now() - exportedAt) / 1000).toFixed(1);
    console.log(
      `probe-web-bundle: the bundle rendered under the Tauri CSP with no console error ` +
        `(export ${exportSeconds}s, probe ${probeSeconds}s, root: ${excerpt(rendered)})`
    );
  } finally {
    await browser.close();
    server.stop(true);
  }
};

await main();
