import type { BrowserContext } from 'playwright-core';
import type { RouteSpec } from '../fake-argus';
import { connected, patchContext, post, routes, store } from '../harness';
import { ownerDevice } from '../seed';
import type { ShimSeed } from '../tauri-shim';
import {
  CORE,
  DARK_ES,
  ENGINE,
  LIGHT_ES,
  MAIN_LOOKS,
  PROTO,
  PROTO_VIEWPORTS,
  VIEWPORTS,
  openScene,
  quiet,
  shoot,
  sleep,
  type Look,
  type Scene,
  type Viewport,
} from './capture';
import { roleContext, roleSeed, type MapRole } from './roles';

export type Row = {
  table: string;
  row: Record<string, unknown> & { id: number; createdAt: number };
};

export type Act = (scene: Scene, baseUrl: string) => Promise<void>;

export type StateSpec = {
  state: string;
  role?: MapRole;
  path?: string;
  routes?: readonly RouteSpec[];
  rows?: readonly Row[];
  context?: Record<string, unknown>;
  seed?: ShimSeed;
  local?: Record<string, unknown>;
  act?: Act;
  before?: (context: BrowserContext) => Promise<void>;
  motion?: boolean;
  latency?: number;
  clock?: number;
  main?: boolean;
  deep?: boolean;
  notes?: string;
};

export type ScreenSpec = {
  screen: string;
  route: string;
  path: string;
  routes?: readonly RouteSpec[];
  rows?: readonly Row[];
  inApp?: boolean;
  perViewport?: boolean;
  states: readonly StateSpec[];
};

const contextReady = async (baseUrl: string): Promise<void> => {
  for (let attempt = 0; attempt < 40; attempt += 1) {
    if ((await connected(baseUrl, 'A')) > 0) break;
    await sleep(250);
  }
  await sleep(1500);
};

export const navigate = async (scene: Scene, baseUrl: string, path: string): Promise<void> => {
  await contextReady(baseUrl);
  await scene.page.evaluate((next) => {
    window.history.pushState({}, '', next);
    window.dispatchEvent(new PopStateEvent('popstate'));
  }, path);
  await quiet(scene.page, baseUrl);
};

const prepare = async (baseUrl: string, screen: ScreenSpec, state: StateSpec): Promise<void> => {
  await post(baseUrl, 'reset', {});
  const role = state.role ?? 'owner';
  await patchContext(baseUrl, { ...roleContext(role), ...(state.context ?? {}) });
  await routes(baseUrl, [...(screen.routes ?? []), ...(state.routes ?? [])]);
  for (const { table, row } of [...(screen.rows ?? []), ...(state.rows ?? [])])
    await store(baseUrl, table, row);
};

const seedOf = (state: StateSpec): ShimSeed => {
  const seed = state.seed ?? (state.role ? roleSeed(state.role) : ownerDevice('A'));
  const extra = Object.fromEntries(
    Object.entries(state.local ?? {}).map(([key, value]) => [
      key,
      typeof value === 'string' ? value : JSON.stringify(value),
    ])
  );
  return { ...seed, local: { ...seed.local, ...extra } };
};

export const cached = (userId: number, key: string, value: unknown): Record<string, unknown> => ({
  [`argus-storage:view.cache.v2.${userId}.${key}`]: value,
});

const once = async (
  baseUrl: string,
  screen: ScreenSpec,
  state: StateSpec,
  look: Look,
  viewports: readonly Viewport[]
): Promise<void> => {
  await prepare(baseUrl, screen, state);
  const target = state.path ?? screen.path;
  const inApp = Boolean(screen.inApp) && !state.deep && target !== '/';
  const scene = await openScene(baseUrl, seedOf(state), look, inApp ? '/' : target, {
    before: state.before,
    motion: state.motion,
    latency: state.latency,
    clock: state.clock,
    viewport: viewports[0],
  });
  try {
    if (inApp) await navigate(scene, baseUrl, target);
    if (state.act) await state.act(scene, baseUrl);
    await shoot(
      scene,
      baseUrl,
      {
        screen: screen.screen,
        route: screen.route,
        state: state.state,
        role: state.role ?? 'owner',
        notes: state.notes ?? '',
      },
      viewports
    );
  } finally {
    await scene.close();
  }
};

const looksOf = (state: StateSpec): readonly Look[] => {
  if (PROTO) return [LIGHT_ES, DARK_ES];
  return state.main ? [LIGHT_ES, ...MAIN_LOOKS] : [LIGHT_ES];
};

const viewportsOf = (state: StateSpec, look: Look): readonly Viewport[] => {
  if (PROTO) return PROTO_VIEWPORTS;
  return state.main && look === LIGHT_ES && ENGINE === 'chromium' ? VIEWPORTS : CORE;
};

export const runScreen = async (
  baseUrl: string,
  screen: ScreenSpec,
  only: readonly string[]
): Promise<string[]> => {
  const failures: string[] = [];
  for (const state of screen.states) {
    if (only.length > 0 && !only.some((part) => state.state.includes(part))) continue;
    for (const look of looksOf(state)) {
      try {
        const viewports = viewportsOf(state, look);
        const runs = screen.perViewport ? viewports.map((viewport) => [viewport]) : [viewports];
        for (const run of runs) await once(baseUrl, screen, state, look, run);
      } catch (error) {
        failures.push(
          `${screen.screen}/${state.state} ${look.theme}/${look.lang}: ${(error as Error).message.split('\n')[0] ?? ''}`
        );
      }
    }
  }
  return failures;
};
