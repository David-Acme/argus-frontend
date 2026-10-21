import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { extname, join, normalize, resolve } from 'node:path';
import { chromium, type Browser, type Page } from 'playwright-core';
import { compare } from './compare';
import { galleryPage, type CaseResult, type StageShot } from './gallery-page';
import { PROTOTYPE_CASES } from './prototype-cases';

const ROOT = join(import.meta.dir, '..', '..');
const DIST = resolve(ROOT, 'dist');
const PROTOTYPE = join(ROOT, 'docs', 'plans', 'redesign-prototype', 'index.html');
const DEFAULT_OUT = '/home/acme/Desktop/argus/uiux-map/redesign/phase1/gallery';
const CHROMIUM = process.env.ARGUS_CHROMIUM ?? '/usr/bin/chromium';
const WIDTHS = [360, 768, 1280] as const;
const THEMES = ['light', 'dark'] as const;
const MODES = [
  { name: 'default', reduced: false },
  { name: 'reduced', reduced: true },
] as const;
const HEIGHT = 900;
const READY_MS = 20000;

type Shot = { width: number; theme: (typeof THEMES)[number]; reduced: boolean; name: string };

type OurCase = { id: string; block: boolean; png: Buffer };

function usage(): never {
  console.log(`usage: bun scripts/ui-lab/capture.ts [--only <id>[,<id>]] [--out <dir>]

Captures every ui-lab component from the web export in dist/ (run web:build first) at
360, 768 and 1280 px, light and dark, default and reduced motion + transparency, builds the
same cases in the redesign prototype from its own helpers, and writes ours | prototype |
diff with the mismatch percentage, results.json and index.html to ${DEFAULT_OUT}.`);
  process.exit(0);
}

function option(name: string): string | undefined {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

function serve() {
  return Bun.serve({
    hostname: '127.0.0.1',
    port: 0,
    async fetch(request) {
      const path = normalize(decodeURIComponent(new URL(request.url).pathname));
      if (path === '/__prototype')
        return new Response(readFileSync(PROTOTYPE), { headers: { 'content-type': 'text/html' } });
      const target = extname(path) ? resolve(DIST, `.${path}`) : join(DIST, 'index.html');
      if (!target.startsWith(DIST)) return new Response('Not found', { status: 404 });
      const file = Bun.file(target);
      return (await file.exists())
        ? new Response(file)
        : new Response('Not found', { status: 404 });
    },
  });
}

async function catalogueIds(page: Page, base: string): Promise<string[]> {
  await page.goto(`${base}/ui-lab`);
  await page.waitForSelector('[data-testid^="ui-lab-entry-"]', { timeout: READY_MS });
  const ids = await page.$$eval('[data-testid^="ui-lab-entry-"]', (nodes) =>
    nodes.map((node) => node.getAttribute('data-testid') ?? '')
  );
  return ids.map((id) => id.replace('ui-lab-entry-', ''));
}

async function settleCases(page: Page, selector: string): Promise<void> {
  await page.$$eval(selector, (nodes) => {
    for (const node of nodes) {
      if (node instanceof HTMLElement)
        node.style.minHeight = `${Math.ceil(node.getBoundingClientRect().height)}px`;
    }
  });
}

async function fitViewport(page: Page, selector: string): Promise<void> {
  const bottom = await page.evaluate(
    (target) => document.querySelector(target)?.getBoundingClientRect().bottom ?? 0,
    selector
  );
  const width = page.viewportSize()?.width ?? WIDTHS[0];
  await page.setViewportSize({ width, height: Math.max(HEIGHT, Math.ceil(bottom) + HEIGHT) });
}

async function ourShots(page: Page, url: string): Promise<{ stage: Buffer; cases: OurCase[] }> {
  await page.goto(url);
  const stage = await page.waitForSelector('[data-testid="ui-lab-stage"]', { timeout: READY_MS });
  await page.evaluate(() => document.fonts.ready);
  await settleCases(page, '[data-testid^="case-"]');
  await fitViewport(page, '[data-testid="ui-lab-stage"]');
  const handles = await page.$$('[data-testid^="case-"]');
  const cases: OurCase[] = [];
  for (const handle of handles) {
    const id = ((await handle.getAttribute('data-testid')) ?? '').replace('case-', '');
    const block = await handle.evaluate((node) => getComputedStyle(node).alignSelf === 'stretch');
    cases.push({ id, block, png: await handle.screenshot({ animations: 'disabled' }) });
  }
  return { stage: await stage.screenshot({ animations: 'disabled' }), cases };
}

type ProtoStage = {
  cases: { id: string; expr: string; block: boolean }[];
  dark: boolean;
  reduced: boolean;
};

async function prototypeShots(page: Page, input: ProtoStage): Promise<Map<string, Buffer>> {
  await page.evaluate(({ cases, dark, reduced }) => {
    document.querySelector('#lab-stage')?.remove();
    const stage = document.createElement('div');
    stage.id = 'lab-stage';
    stage.className = dark ? 'ui dark' : 'ui';
    stage.style.cssText =
      'position:absolute;left:0;top:0;width:100%;z-index:1000;padding:16px;display:flex;flex-direction:column;gap:16px;box-sizing:border-box';
    for (const item of cases) {
      const wrapper = document.createElement('div');
      wrapper.dataset.case = item.id;
      wrapper.style.cssText = `display:flex;flex-direction:column;align-self:${item.block ? 'stretch' : 'flex-start'}`;
      wrapper.innerHTML = String((0, eval)(item.expr));
      stage.append(wrapper);
    }
    document.body.prepend(stage);
    document.body.classList.toggle('rm', reduced);
    document.body.classList.toggle('rt', reduced);
    window.scrollTo(0, 0);
  }, input);
  await settleCases(page, '[data-case]');
  await fitViewport(page, '#lab-stage');
  const shots = new Map<string, Buffer>();
  for (const item of input.cases) {
    const handle = await page.$(`[data-case="${item.id}"]`);
    if (handle) shots.set(item.id, await handle.screenshot({ animations: 'disabled' }));
  }
  return shots;
}

function shotsFor(width: number): Shot[] {
  return THEMES.flatMap((theme) =>
    MODES.map((mode) => ({
      width,
      theme,
      reduced: mode.reduced,
      name: `${width}-${theme}-${mode.name}`,
    }))
  );
}

type CaptureContext = {
  ours: Page;
  prototype: Page;
  base: string;
  out: string;
  stages: StageShot[];
  results: CaseResult[];
};

async function captureComponent(
  context: CaptureContext,
  component: string,
  shot: Shot
): Promise<void> {
  const params = `c=${component}&theme=${shot.theme}${shot.reduced ? '&rm=1&rt=1' : ''}`;
  const { stage, cases } = await ourShots(context.ours, `${context.base}/ui-lab?${params}`);
  const folder = join(context.out, component);
  mkdirSync(join(folder, 'compare', shot.name), { recursive: true });
  writeFileSync(join(folder, `stage-${shot.name}.png`), stage);
  context.stages.push({ component, shot: shot.name, file: `${component}/stage-${shot.name}.png` });
  const markup = PROTOTYPE_CASES[component] ?? {};
  const known = cases.filter((item) => markup[item.id] !== undefined);
  const prototype = await prototypeShots(context.prototype, {
    cases: known.map((item) => ({ id: item.id, expr: markup[item.id] ?? "''", block: item.block })),
    dark: shot.theme === 'dark',
    reduced: shot.reduced,
  });
  for (const item of cases) {
    const theirs = prototype.get(item.id);
    const file = `${component}/compare/${shot.name}/${item.id}.png`;
    const result = theirs ? compare(item.png, theirs) : null;
    writeFileSync(join(context.out, file), result ? result.sheet : item.png);
    context.results.push({
      component,
      shot: shot.name,
      caseId: item.id,
      mismatch: result?.mismatch ?? null,
      file,
    });
  }
}

type WidthRun = {
  browser: Browser;
  base: string;
  out: string;
  only: string[] | undefined;
  stages: StageShot[];
  results: CaseResult[];
};

async function captureWidth(run: WidthRun, width: number): Promise<void> {
  const context = await run.browser.newContext({
    viewport: { width, height: HEIGHT },
    reducedMotion: 'reduce',
    locale: 'es-ES',
  });
  await context.addInitScript(() => Reflect.set(globalThis, '__ARGUS_UI_LAB__', true));
  const ours = await context.newPage();
  const prototype = await context.newPage();
  await prototype.goto(`${run.base}/__prototype`);
  const ids = (await catalogueIds(ours, run.base)).filter(
    (id) => !run.only || run.only.includes(id)
  );
  const capture: CaptureContext = {
    ours,
    prototype,
    base: run.base,
    out: run.out,
    stages: run.stages,
    results: run.results,
  };
  for (const component of ids) {
    for (const shot of shotsFor(width)) await captureComponent(capture, component, shot);
    console.log(`capture: ${component} at ${width}`);
  }
  await context.close();
}

async function main(): Promise<void> {
  if (process.argv.includes('--help')) usage();
  const out = option('--out') ?? DEFAULT_OUT;
  const only = option('--only')?.split(',');
  const server = serve();
  const base = `http://127.0.0.1:${server.port}`;
  const browser = await chromium.launch({ executablePath: CHROMIUM });
  const stages: StageShot[] = [];
  const results: CaseResult[] = [];
  try {
    for (const width of WIDTHS) {
      await captureWidth({ browser, base, out, only, stages, results }, width);
    }
  } finally {
    await browser.close();
    server.stop(true);
  }
  mkdirSync(out, { recursive: true });
  writeFileSync(join(out, 'results.json'), JSON.stringify(results, null, 2));
  writeFileSync(join(out, 'index.html'), galleryPage(stages, results));
  console.log(`capture: ${stages.length} stages, ${results.length} cases in ${out}`);
}

await main();
