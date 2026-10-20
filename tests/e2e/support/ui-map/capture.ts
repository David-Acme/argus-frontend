import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { chromium, webkit, type Browser, type BrowserContext, type Page } from 'playwright-core';
import { cdpEndpoint } from '../chromium';
import { installFixedClock, FIXED_NOW } from '../clock';
import { control, NOT_LOOPBACK } from '../harness';
import { installTauriShim, type ShimSeed } from '../tauri-shim';

export type Engine = 'chromium' | 'webkit';

export type Theme = 'light' | 'dark';

export type Lang = 'es' | 'en';

export type Look = { theme: Theme; lang: Lang };

export type Viewport = { name: string; w: number; h: number };

export type Shot = {
  screen: string;
  route: string;
  state: string;
  role: string;
  notes?: string;
};

export type SceneOptions = {
  viewport?: Viewport;
  motion?: boolean;
  latency?: number;
  before?: (context: BrowserContext) => Promise<void>;
};

export type Scene = {
  page: Page;
  context: BrowserContext;
  look: Look;
  errors: string[];
  escapes: string[];
  close: () => Promise<void>;
};

type ManifestEntry = {
  screen: string;
  route: string;
  state: string;
  viewport: { name: string; w: number; h: number };
  theme: Theme;
  lang: Lang;
  role: string;
  engine: Engine;
  file: string;
  fullPage: boolean;
  notes: string;
  auto: Audit;
  errors: string[];
};

export type Audit = {
  horizontalOverflow: number;
  verticalOverflow: number;
  offscreen: string[];
  truncated: string[];
  smallTargets: number;
  overlapping: string[];
};

export const VIEWPORTS: readonly Viewport[] = [
  { name: 'phone-small', w: 320, h: 568 },
  { name: 'phone', w: 360, h: 800 },
  { name: 'phone-large', w: 430, h: 932 },
  { name: 'tablet-portrait', w: 768, h: 1024 },
  { name: 'tablet-landscape', w: 1024, h: 768 },
  { name: 'laptop', w: 1366, h: 768 },
  { name: 'desktop', w: 1440, h: 900 },
  { name: 'desktop-large', w: 1920, h: 1080 },
  { name: 'wide', w: 2560, h: 1440 },
];

const CORE_NAMES = new Set(['phone', 'tablet-portrait', 'desktop']);

export const CORE: readonly Viewport[] = VIEWPORTS.filter((viewport) => CORE_NAMES.has(viewport.name));

export const ENGINE: Engine = process.env.ARGUS_UI_MAP_ENGINE === 'webkit' ? 'webkit' : 'chromium';

export const ENABLED = Boolean(process.env.ARGUS_UI_MAP_DIR);

export const SKIP_REASON = 'the UI map runs only with ARGUS_UI_MAP_DIR set (bun run ui-map; ARGUS_UI_MAP_ENGINE=webkit for the WebKit pass)';

const ROOT = process.env.ARGUS_UI_MAP_DIR ?? '';

const OUT = join(ROOT, ENGINE === 'webkit' ? 'webkit' : 'web');

const MANIFEST = join(OUT, 'manifest.json');

const FULL_PAGE_LIMIT = 9000;

const LATENCY_MS = Number(process.env.ARGUS_UI_MAP_LATENCY_MS ?? 1200);

const QUIET_MS = LATENCY_MS + 350;

const SETTLE_MS = 700;


export const LIGHT_ES: Look = { theme: 'light', lang: 'es' };

export const MAIN_LOOKS: readonly Look[] = [
  { theme: 'dark', lang: 'es' },
  { theme: 'light', lang: 'en' },
];

let browser: Browser | null = null;

const openBrowser = async (): Promise<Browser> => {
  if (browser?.isConnected()) return browser;
  browser =
    ENGINE === 'webkit'
      ? await webkit.launch({ env: { ...process.env, TZ: 'America/Lima' } })
      : await chromium.connectOverCDP(await cdpEndpoint());
  return browser;
};

export const closeBrowser = async (): Promise<void> => {
  if (!browser) return;
  if (ENGINE === 'webkit') await browser.close();
  browser = null;
};

export const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

const withLook = (seed: ShimSeed, look: Look): ShimSeed => ({
  ...seed,
  local: {
    ...seed.local,
    'argus-storage:app.theme': look.theme,
    'argus-storage:app.language': look.lang,
  },
});

export const requestCount = async (baseUrl: string): Promise<number> =>
  ((await control(baseUrl, 'requests')) as { requests: string[] }).requests.length;

export const quiet = async (page: Page, baseUrl: string, extra = SETTLE_MS): Promise<void> => {
  await page.evaluate(() => document.fonts.ready.then(() => undefined)).catch(() => undefined);
  let last = -1;
  for (let round = 0; round < 20; round += 1) {
    const now = await requestCount(baseUrl);
    if (now === last) break;
    last = now;
    await sleep(QUIET_MS);
  }
  await sleep(extra);
};

export const openScene = async (
  baseUrl: string,
  seed: ShimSeed,
  look: Look,
  path: string,
  options: SceneOptions = {}
): Promise<Scene> => {
  const viewport = options.viewport ?? (CORE[0] as Viewport);
  const connection = await openBrowser();
  const context = await connection.newContext({
    viewport: { width: viewport.w, height: viewport.h },
    colorScheme: look.theme,
    locale: look.lang === 'es' ? 'es-PE' : 'en-US',
    timezoneId: 'America/Lima',
    reducedMotion: options.motion ? 'no-preference' : 'reduce',
    deviceScaleFactor: 1,
  });
  const escapes: string[] = [];
  const errors: string[] = [];
  await context.route(NOT_LOOPBACK, (route) => {
    escapes.push(route.request().url());
    return route.abort();
  });
  const latency = options.latency ?? LATENCY_MS;
  if (latency > 0) {
    await context.route('**/__api/**', async (route) => {
      if (route.request().method() === 'GET') await sleep(latency);
      await route.continue().catch(() => undefined);
    });
  }
  await context.addInitScript(installFixedClock, FIXED_NOW);
  await context.addInitScript(installTauriShim, withLook(seed, look));
  if (options.before) await options.before(context);
  const page = await context.newPage();
  page.on('pageerror', (error) => errors.push(`pageerror: ${error.message}`));
  page.on('console', (message) => {
    if (message.type() === 'error' && !message.text().startsWith('Failed to load resource')) {
      errors.push(`console: ${message.text().slice(0, 300)}`);
    }
  });
  page.on('response', (response) => {
    if (response.status() >= 400) errors.push(`http ${response.status()}: ${new URL(response.url()).pathname.replace('/__api', '')}`);
  });
  await page.goto(new URL(path, baseUrl).toString());
  await quiet(page, baseUrl);
  return {
    page,
    context,
    look,
    errors,
    escapes,
    close: async () => {
      await context.close();
    },
  };
};

export const go = async (scene: Scene, baseUrl: string, path: string): Promise<void> => {
  await scene.page.goto(new URL(path, baseUrl).toString());
  await quiet(scene.page, baseUrl);
};

const audit = (page: Page): Promise<Audit> =>
  page.evaluate(() => {
    const width = window.innerWidth;
    const height = window.innerHeight;
    const label = (element: Element): string =>
      (element.getAttribute('aria-label') ?? element.textContent ?? '').trim().replace(/\s+/g, ' ').slice(0, 60);
    const visible = (element: Element): boolean => {
      const style = getComputedStyle(element);
      if (style.visibility === 'hidden' || style.display === 'none' || Number(style.opacity) === 0) return false;
      const rect = element.getBoundingClientRect();
      return rect.width > 0 && rect.height > 0;
    };
    let verticalOverflow = Math.max(0, document.documentElement.scrollHeight - height);
    for (const element of Array.from(document.querySelectorAll('div'))) {
      const style = getComputedStyle(element);
      if (style.overflowY !== 'auto' && style.overflowY !== 'scroll') continue;
      if (element.clientHeight < 160 || !visible(element)) continue;
      verticalOverflow = Math.max(verticalOverflow, element.scrollHeight - element.clientHeight);
    }
    const offscreen: string[] = [];
    const truncated: string[] = [];
    let smallTargets = 0;
    const leaves = Array.from(document.querySelectorAll('[role="button"], button, a, [dir="auto"]'));
    for (const element of leaves) {
      if (!visible(element)) continue;
      const rect = element.getBoundingClientRect();
      const text = label(element);
      if (rect.right > width + 1 && rect.left < width && text && offscreen.length < 8) offscreen.push(text);
      if (element.getAttribute('dir') === 'auto' && element.scrollWidth > element.clientWidth + 1 && text) {
        const style = getComputedStyle(element);
        if ((style.textOverflow === 'ellipsis' || style.webkitLineClamp !== 'none') && truncated.length < 12) truncated.push(text);
      }
      const interactive = element.getAttribute('role') === 'button' || element.tagName === 'BUTTON' || element.tagName === 'A';
      if (interactive && rect.top < height && (rect.width < 24 || rect.height < 24)) smallTargets += 1;
    }
    const overlapping: string[] = [];
    const buttons = Array.from(document.querySelectorAll('[role="button"], button')).filter(visible);
    for (let first = 0; first < buttons.length && overlapping.length < 6; first += 1) {
      const a = buttons[first] as Element;
      const ra = a.getBoundingClientRect();
      for (let second = first + 1; second < buttons.length; second += 1) {
        const b = buttons[second] as Element;
        if (a.contains(b) || b.contains(a)) continue;
        const rb = b.getBoundingClientRect();
        const x = Math.min(ra.right, rb.right) - Math.max(ra.left, rb.left);
        const y = Math.min(ra.bottom, rb.bottom) - Math.max(ra.top, rb.top);
        if (x > 6 && y > 6 && x * y > 0.3 * Math.min(ra.width * ra.height, rb.width * rb.height)) {
          overlapping.push(`${label(a)} / ${label(b)}`);
          break;
        }
      }
    }
    return {
      horizontalOverflow: Math.max(0, document.documentElement.scrollWidth - width),
      verticalOverflow,
      offscreen,
      truncated,
      smallTargets,
      overlapping,
    };
  });

const readManifest = (): ManifestEntry[] =>
  existsSync(MANIFEST) ? (JSON.parse(readFileSync(MANIFEST, 'utf8')) as ManifestEntry[]) : [];

const record = (entry: ManifestEntry): void => {
  mkdirSync(OUT, { recursive: true });
  const entries = readManifest().filter((existing) => existing.file !== entry.file);
  entries.push(entry);
  writeFileSync(MANIFEST, `${JSON.stringify(entries, null, 1)}\n`);
};

const safe = (value: string): string => value.replace(/[^a-z0-9.-]+/gi, '-').replace(/^-|-$/g, '').toLowerCase();

const parkPointer = async (page: Page, viewport: Viewport): Promise<void> => {
  await page.mouse.move(viewport.w - 2, viewport.h - 2).catch(() => undefined);
};

const capture = async (
  scene: Scene,
  shot: Shot,
  viewport: Viewport,
  size: { w: number; h: number },
  fullPage: boolean
): Promise<void> => {
  const state = fullPage ? `${shot.state}-full` : shot.state;
  const target = join(OUT, safe(shot.screen), `${safe(state)}__${viewport.name}__${scene.look.theme}__${scene.look.lang}.png`);
  mkdirSync(dirname(target), { recursive: true });
  const found = await audit(scene.page);
  await scene.page.screenshot({ path: target, animations: 'disabled', caret: 'hide' });
  record({
    screen: shot.screen,
    route: shot.route,
    state,
    viewport: { name: viewport.name, w: size.w, h: size.h },
    theme: scene.look.theme,
    lang: scene.look.lang,
    role: shot.role,
    engine: ENGINE,
    file: relative(OUT, target),
    fullPage,
    notes: shot.notes ?? '',
    auto: found,
    errors: [...new Set(scene.errors)].slice(0, 8),
  });
};

export const shoot = async (scene: Scene, baseUrl: string, shot: Shot, viewports: readonly Viewport[]): Promise<void> => {
  const list = ENGINE === 'webkit' ? viewports.filter((viewport) => CORE_NAMES.has(viewport.name)) : viewports;
  for (const viewport of list) {
    await scene.page.setViewportSize({ width: viewport.w, height: viewport.h });
    await parkPointer(scene.page, viewport);
    await quiet(scene.page, baseUrl, SETTLE_MS);
    await capture(scene, shot, viewport, { w: viewport.w, h: viewport.h }, false);
    const overflow = (await audit(scene.page)).verticalOverflow;
    if (overflow > 8) {
      const tall = Math.min(viewport.h + overflow, FULL_PAGE_LIMIT);
      await scene.page.setViewportSize({ width: viewport.w, height: tall });
      await quiet(scene.page, baseUrl, SETTLE_MS);
      await capture(scene, shot, viewport, { w: viewport.w, h: tall }, true);
      await scene.page.setViewportSize({ width: viewport.w, height: viewport.h });
    }
  }
  scene.errors.length = 0;
};
