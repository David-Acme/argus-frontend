import { describe, expect, test } from 'bun:test';
import type { IServiceResponse } from '@/core/interfaces';
import { ModuleEngine, type ModuleEngineDeps } from '@/core/services/modules/module-engine';
import type { ModuleAction, ModuleCatalog, ModuleJob, ModuleRecord, ModuleTransition } from '@/core/types';

const job = (patch: Partial<ModuleJob> = {}): ModuleJob => ({
  id: '1',
  state: 'downloading',
  progress: 0.25,
  bytesDone: 250,
  bytesTotal: 1000,
  bytesPerSecond: 10,
  etaSeconds: 75,
  reason: null,
  ...patch,
});

const module = (patch: Partial<ModuleRecord> = {}): ModuleRecord => ({
  id: 'surveillance',
  name: 'Vigilancia',
  summary: '',
  kind: 'available',
  lifecycle: 'not_installed',
  enabled: false,
  hasData: false,
  dataPurgedAt: null,
  requires: [],
  sizeBytes: 1000,
  installedBytes: 0,
  hardware: null,
  job: null,
  gettingStarted: [],
  components: [],
  detailed: true,
  ...patch,
});

const ok = <T>(info: T): IServiceResponse<T> => ({ status: 200, ok: true, info, errors: null });
const refused = (status: number, code: string): IServiceResponse<never> => ({
  status,
  ok: false,
  info: null,
  errors: { code, message: code },
});

type Harness = {
  engine: ModuleEngine;
  cache: { value: ModuleCatalog | null };
  loads: number;
  answers: IServiceResponse<ModuleRecord[]>[];
  actions: [string, ModuleAction][];
  actAnswer: IServiceResponse<ModuleRecord | ModuleJob>;
  timers: Map<number, () => void>;
  fire: () => void;
  frame: (info: unknown) => void;
  connect: () => void;
  disconnect: () => void;
  foreground: () => void;
  refuse: (path: string) => void;
  connected: boolean;
  transitions: ModuleTransition[];
  stamps: Record<string, Record<string, number>>;
  dropped: string[][];
  dropFails: boolean;
};

function harness(initial: ModuleCatalog | null = null): Harness {
  const listeners: Record<string, (value?: unknown) => void> = {};
  let handles = 0;
  let last: IServiceResponse<ModuleRecord[]> = ok([]);
  const h = {
    cache: { value: initial },
    loads: 0,
    answers: [] as IServiceResponse<ModuleRecord[]>[],
    actions: [] as [string, ModuleAction][],
    actAnswer: ok(job({ state: 'queued', progress: 0 })) as IServiceResponse<ModuleRecord | ModuleJob>,
    timers: new Map<number, () => void>(),
    connected: true,
    transitions: [] as ModuleTransition[],
    stamps: {},
    dropped: [],
    dropFails: false,
  } as unknown as Harness;
  const on = (name: string) => (listener: (value?: unknown) => void) => {
    listeners[name] = listener;
    return () => delete listeners[name];
  };
  const deps: ModuleEngineDeps = {
    load: async () => {
      h.loads += 1;
      last = h.answers.shift() ?? last;
      return last;
    },
    act: async (id, action) => {
      h.actions.push([id, action]);
      return h.actAnswer;
    },
    cache: { read: () => h.cache.value, write: (value) => (h.cache.value = value) },
    purges: {
      read: (session) => h.stamps[session] ?? {},
      write: (session, stamps) => {
        h.stamps[session] = stamps;
      },
    },
    dropModuleData: async (ids) => {
      h.dropped.push([...ids]);
      if (h.dropFails) throw new Error('busy');
    },
    socket: {
      onFrame: on('frame'),
      onConnect: on('connect'),
      onDisconnect: on('disconnect'),
      isConnected: () => h.connected,
    },
    onForeground: on('foreground'),
    onRefusal: on('refusal') as ModuleEngineDeps['onRefusal'],
    setTimer: (run) => {
      handles += 1;
      h.timers.set(handles, run);
      return handles;
    },
    clearTimer: (handle) => {
      h.timers.delete(handle as number);
    },
    now: () => 100,
    pollMs: 3000,
  };
  h.engine = new ModuleEngine(deps);
  h.engine.onTransition((transition) => h.transitions.push(transition));
  h.fire = () => {
    const [handle, run] = [...h.timers.entries()].at(-1) ?? [];
    if (handle === undefined || !run) return;
    h.timers.delete(handle);
    run();
  };
  h.frame = (info) => listeners.frame?.(info);
  h.connect = () => listeners.connect?.();
  h.disconnect = () => listeners.disconnect?.();
  h.foreground = () => listeners.foreground?.();
  h.refuse = (path) => listeners.refusal?.(path);
  return h;
}

const settle = () => new Promise((resolve) => setTimeout(resolve, 0));
const pendingTimers = (h: Harness) => h.timers.size;

describe('module engine', () => {
  test('paints the cached catalog first and then asks the server', async () => {
    const cached = { supported: true, fetchedAt: 1, modules: [module({ name: 'Antes' })] };
    const h = harness(cached);
    h.answers.push(ok([module({ name: 'Ahora' })]));
    expect(h.engine.current()?.modules[0]?.name).toBe('Antes');
    h.engine.start('7');
    await settle();
    expect(h.loads).toBe(1);
    expect(h.engine.current()?.modules[0]?.name).toBe('Ahora');
  });

  test('a server without modules is remembered as unsupported', async () => {
    const h = harness();
    h.answers.push(refused(404, 'NOT_FOUND'));
    h.engine.start('7');
    await settle();
    expect(h.engine.current()?.supported).toBe(false);
  });

  test('a network failure keeps what was cached', async () => {
    const cached = { supported: true, fetchedAt: 1, modules: [module()] };
    const h = harness(cached);
    h.answers.push(refused(0, 'NETWORK_ERROR'));
    h.engine.start('7');
    await settle();
    expect(h.engine.current()).toEqual(cached);
  });

  test('refreshes after a reconnect and when the app comes back', async () => {
    const h = harness();
    h.engine.start('7');
    await settle();
    h.connect();
    await settle();
    h.foreground();
    await settle();
    expect(h.loads).toBe(3);
  });

  test('follows module_update frames and ignores unsettled enabled sets', async () => {
    const h = harness();
    h.answers.push(ok([module({ job: job() })]));
    h.engine.start('7');
    await settle();
    h.frame({ id: 'surveillance', name: 'Vigilancia', summary: '', kind: 'available', enabled: false, requires: [], sizeBytes: 1000, installedBytes: 0, hardware: null, job: { ...job(), progress: 0.6, bytesDone: 600 }, gettingStarted: [] });
    expect(h.engine.current()?.modules[0]?.job?.progress).toBe(0.6);
    h.frame({ settled: false, modules: [{ id: 'surveillance', enabled: true }] });
    expect(h.engine.current()?.modules[0]?.enabled).toBe(false);
    h.frame({ modules: [{ id: 'surveillance', enabled: true }] });
    expect(h.engine.current()?.modules[0]?.enabled).toBe(true);
  });

  test('an enabled set older than the last one applied is dropped', async () => {
    const h = harness();
    h.answers.push(ok([module()]));
    h.engine.start('7');
    await settle();
    h.frame({ version: 5, modules: [{ id: 'surveillance', enabled: true }] });
    h.frame({ version: 4, modules: [{ id: 'surveillance', enabled: false }] });
    expect(h.engine.current()?.modules[0]?.enabled).toBe(true);
    h.frame({ version: 6, modules: [{ id: 'surveillance', enabled: false }] });
    expect(h.engine.current()?.modules[0]?.enabled).toBe(false);
  });

  test('polls every 3 s only while a job runs and the socket is down', async () => {
    const h = harness();
    h.connected = false;
    h.answers.push(ok([module({ job: job() })]));
    h.engine.start('7');
    await settle();
    expect(pendingTimers(h)).toBe(1);
    h.answers.push(ok([module({ job: job({ state: 'done', progress: 1 }) })]));
    h.fire();
    await settle();
    expect(h.loads).toBe(2);
    expect(pendingTimers(h)).toBe(0);
    expect(h.transitions.map((item) => item.state)).toEqual(['done']);
  });

  test('does not poll while the socket is up', async () => {
    const h = harness();
    h.answers.push(ok([module({ job: job() })]));
    h.engine.start('7');
    await settle();
    expect(pendingTimers(h)).toBe(0);
    h.connected = false;
    h.disconnect();
    expect(pendingTimers(h)).toBe(1);
  });

  test('an action shows at once and keeps the server answer', async () => {
    const h = harness();
    h.answers.push(ok([module()]));
    h.engine.start('7');
    await settle();
    h.answers.push(ok([module({ job: job({ state: 'queued', progress: 0 }) })]));
    const pending = h.engine.act('surveillance', 'install');
    expect(h.engine.current()?.modules[0]?.job?.state).toBe('queued');
    await pending;
    await settle();
    expect(h.actions).toEqual([['surveillance', 'install']]);
    expect(h.engine.current()?.modules[0]?.job?.id).toBe('1');
    expect(h.loads).toBe(2);
  });

  test('a refused action rolls back', async () => {
    const h = harness();
    h.answers.push(ok([module({ enabled: true })]));
    h.engine.start('7');
    await settle();
    h.actAnswer = refused(409, 'MODULE_REQUIRED_BY');
    const result = await h.engine.act('surveillance', 'disable');
    expect(result.ok).toBe(false);
    expect(h.engine.current()?.modules[0]?.enabled).toBe(true);
  });

  test('a MODULE_DISABLED refusal hides that module and refreshes', async () => {
    const h = harness();
    h.answers.push(ok([module({ enabled: true })]));
    h.engine.start('7');
    await settle();
    h.answers.push(ok([module({ enabled: false })]));
    h.refuse('/camera/overview');
    expect(h.engine.current()?.modules[0]?.enabled).toBe(false);
    await settle();
    expect(h.loads).toBe(2);
  });

  test('stops listening and polling on stop, and a new session restarts', async () => {
    const h = harness();
    h.connected = false;
    h.answers.push(ok([module({ job: job() })]));
    h.engine.start('7');
    await settle();
    h.engine.stop();
    expect(pendingTimers(h)).toBe(0);
    h.connect();
    await settle();
    expect(h.loads).toBe(1);
    h.engine.start('8');
    await settle();
    expect(h.loads).toBe(2);
  });

  test('drops a module\'s local data once for each newer purge, also after being offline', async () => {
    const h = harness();
    h.answers.push(ok([module({ dataPurgedAt: 500 })]));
    h.engine.start('7');
    await settle();
    await h.engine.reconcilePurges();
    expect(h.dropped).toEqual([['surveillance']]);
    expect(h.stamps['7']).toEqual({ surveillance: 500 });
    h.frame({ ...module({ dataPurgedAt: 500 }), job: null });
    await h.engine.reconcilePurges();
    expect(h.dropped).toHaveLength(1);
    h.frame({ ...module({ dataPurgedAt: 900 }), job: null });
    await h.engine.reconcilePurges();
    expect(h.dropped).toEqual([['surveillance'], ['surveillance']]);
  });

  test('a failed local drop is retried on the next answer', async () => {
    const h = harness();
    h.dropFails = true;
    h.answers.push(ok([module({ dataPurgedAt: 500 })]));
    h.engine.start('7');
    await settle();
    await h.engine.reconcilePurges();
    expect(h.stamps['7']).toBeUndefined();
    h.dropFails = false;
    await h.engine.refresh();
    await h.engine.reconcilePurges();
    expect(h.stamps['7']).toEqual({ surveillance: 500 });
  });
});
