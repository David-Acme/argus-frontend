import { describe, expect, test } from 'bun:test';
import type { IServiceResponse } from '@/core/interfaces';
import { ModuleEngine, type ModuleEngineDeps } from '@/core/services/modules/module-engine';
import type {
  AppContext,
  ModuleAction,
  ModuleCatalog,
  ModuleJob,
  ModuleRecord,
  ModuleTransition,
  UserRole,
} from '@/core/types';
import { moduleRecord } from './support/access-fixtures';

const job = (patch: Partial<ModuleJob> = {}): ModuleJob => ({
  id: '1',
  kind: 'install',
  state: 'downloading',
  progress: 0.25,
  bytesDone: 250,
  bytesTotal: 1000,
  bytesPerSecond: 10,
  etaSeconds: 75,
  reason: null,
  owner: null,
  ...patch,
});

const module = (patch: Partial<ModuleRecord> = {}): ModuleRecord => moduleRecord(patch);

const brief = (patch: Partial<ModuleRecord> = {}): ModuleRecord =>
  module({ detailed: false, sizeBytes: 0, hardware: null, ...patch });

const context = (
  patch: Partial<Pick<AppContext, 'modules' | 'ownerCatalog'>> & { role?: UserRole | null } = {}
): AppContext => ({
  userId: 7,
  role: patch.role === undefined ? 'owner' : patch.role,
  roleActive: true,
  capabilities: [],
  roles: [],
  modules: patch.modules ?? [],
  version: null,
  ownerCatalog: patch.ownerCatalog ?? null,
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
  actions: [string, ModuleAction][];
  actAnswer: IServiceResponse<ModuleRecord | ModuleJob>;
  frame: (info: unknown) => void;
  refuse: (path: string) => void;
  transitions: ModuleTransition[];
  stamps: Record<string, Record<string, number>>;
  dropped: string[][];
  dropFails: boolean;
  language: 'es' | 'en';
};

function harness(initial: ModuleCatalog | null = null): Harness {
  const listeners: Record<string, (value?: unknown) => void> = {};
  const h = {
    cache: { value: initial },
    actions: [] as [string, ModuleAction][],
    actAnswer: ok(job({ state: 'queued', progress: 0 })) as IServiceResponse<ModuleRecord | ModuleJob>,
    transitions: [] as ModuleTransition[],
    stamps: {},
    dropped: [],
    dropFails: false,
    language: 'es',
  } as unknown as Harness;
  const on = (name: string) => (listener: (value?: unknown) => void) => {
    listeners[name] = listener;
    return () => delete listeners[name];
  };
  const deps: ModuleEngineDeps = {
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
    socket: { onFrame: on('frame') },
    onRefusal: on('refusal') as ModuleEngineDeps['onRefusal'],
    now: () => 100,
    language: () => h.language,
  };
  h.engine = new ModuleEngine(deps);
  h.engine.onTransition((transition) => h.transitions.push(transition));
  h.frame = (info) => listeners.frame?.(info);
  h.refuse = (path) => listeners.refusal?.(path);
  return h;
}

const settle = () => new Promise((resolve) => setTimeout(resolve, 0));

describe('module engine', () => {
  test('keeps the cached catalog until the socket brings the context', () => {
    const cached = { fetchedAt: 1, modules: [module({ name: 'Antes' })] };
    const h = harness(cached);
    h.engine.start('7');
    expect(h.engine.current()?.modules[0]?.name).toBe('Antes');
    h.engine.applyContext(context({ ownerCatalog: [module({ name: 'Ahora' })] }));
    expect(h.engine.current()?.modules[0]?.name).toBe('Ahora');
  });

  test('ignores a context while no session is started', () => {
    const h = harness();
    h.engine.applyContext(context({ ownerCatalog: [module()] }));
    expect(h.engine.current()).toBeNull();
  });

  test('the owner catalog carries detail and takes intro and roles from the brief list', () => {
    const h = harness();
    h.engine.start('7');
    const intro = { any: { what: 'Cámaras', examples: ['Ver el patio'] } };
    h.engine.applyContext(
      context({
        modules: [brief({ intro, roles: ['guard'], summary: 'Cuida tu casa' })],
        ownerCatalog: [module({ summary: '' })],
      })
    );
    const [first] = h.engine.current()?.modules ?? [];
    expect(first?.detailed).toBe(true);
    expect(first?.intro).toEqual(intro);
    expect(first?.roles).toEqual(['guard']);
    expect(first?.summary).toBe('Cuida tu casa');
  });

  test('a brief list for someone else keeps names and flags and never a stale owner detail', () => {
    const h = harness();
    h.engine.start('7');
    h.engine.applyContext(context({ ownerCatalog: [module({ hardware: { verdict: 'ok', reasons: [], minRamMb: 1, recommendedRamMb: 2, freeDiskMb: 3 } })] }));
    h.engine.applyContext(context({ role: 'resident', modules: [brief({ enabled: true, lifecycle: 'active' })] }));
    const [first] = h.engine.current()?.modules ?? [];
    expect(first?.enabled).toBe(true);
    expect(first?.hardware).toBeNull();
    expect(first?.detailed).toBe(false);
  });

  test('a brief update for the owner keeps the detail it already has', () => {
    const h = harness();
    h.engine.start('7');
    h.engine.applyContext(context({ ownerCatalog: [module({ job: job() })] }));
    h.engine.applyContext(context({ modules: [brief({ enabled: true, lifecycle: 'active' })] }));
    const [first] = h.engine.current()?.modules ?? [];
    expect(first?.enabled).toBe(true);
    expect(first?.job?.state).toBe('downloading');
  });

  test('job progress never goes backwards across contexts', () => {
    const h = harness();
    h.engine.start('7');
    h.engine.applyContext(context({ ownerCatalog: [module({ job: job({ progress: 0.6, bytesDone: 600 }) })] }));
    h.engine.applyContext(context({ ownerCatalog: [module({ job: job({ progress: 0.4, bytesDone: 400 }) })] }));
    expect(h.engine.current()?.modules[0]?.job?.progress).toBe(0.6);
  });

  test('follows module_update frames and ignores unsettled enabled sets', () => {
    const h = harness();
    h.engine.start('7');
    h.engine.applyContext(context({ ownerCatalog: [module({ job: job() })] }));
    h.frame({
      id: 'surveillance',
      name: 'Vigilancia',
      summary: '',
      kind: 'available',
      enabled: false,
      requires: [],
      sizeBytes: 1000,
      installedBytes: 0,
      hardware: null,
      job: { ...job(), progress: 0.6, bytesDone: 600 },
      gettingStarted: [],
    });
    expect(h.engine.current()?.modules[0]?.job?.progress).toBe(0.6);
    h.frame({ settled: false, modules: [{ id: 'surveillance', enabled: true }] });
    expect(h.engine.current()?.modules[0]?.enabled).toBe(false);
    h.frame({ modules: [{ id: 'surveillance', enabled: true }] });
    expect(h.engine.current()?.modules[0]?.enabled).toBe(true);
  });

  test('an enabled set older than the last one applied is dropped', () => {
    const h = harness();
    h.engine.start('7');
    h.engine.applyContext(context({ ownerCatalog: [module()] }));
    h.frame({ version: 5, modules: [{ id: 'surveillance', enabled: true }] });
    h.frame({ version: 4, modules: [{ id: 'surveillance', enabled: false }] });
    expect(h.engine.current()?.modules[0]?.enabled).toBe(true);
    h.frame({ version: 6, modules: [{ id: 'surveillance', enabled: false }] });
    expect(h.engine.current()?.modules[0]?.enabled).toBe(false);
  });

  test('an action shows at once and keeps the server answer without asking again', async () => {
    const h = harness();
    h.engine.start('7');
    h.engine.applyContext(context({ ownerCatalog: [module()] }));
    const pending = h.engine.act('surveillance', 'install');
    expect(h.engine.current()?.modules[0]?.job?.state).toBe('queued');
    await pending;
    expect(h.actions).toEqual([['surveillance', 'install']]);
    expect(h.engine.current()?.modules[0]?.job?.id).toBe('1');
  });

  test('a refused action rolls back', async () => {
    const h = harness();
    h.engine.start('7');
    h.engine.applyContext(context({ ownerCatalog: [module({ enabled: true })] }));
    h.actAnswer = refused(409, 'MODULE_REQUIRED_BY');
    const result = await h.engine.act('surveillance', 'disable');
    expect(result.ok).toBe(false);
    expect(h.engine.current()?.modules[0]?.enabled).toBe(true);
  });

  test('a MODULE_DISABLED refusal hides that module', () => {
    const h = harness();
    h.engine.start('7');
    h.engine.applyContext(context({ ownerCatalog: [module({ enabled: true })] }));
    h.refuse('/camera/overview');
    expect(h.engine.current()?.modules[0]?.enabled).toBe(false);
  });

  test('reports a job that finishes while it was followed, in the app language', () => {
    const h = harness();
    h.language = 'en';
    h.engine.start('7');
    const texts = { name: { es: 'Vigilancia', en: 'Surveillance' }, summary: {} };
    h.engine.applyContext(context({ ownerCatalog: [module({ texts, job: job() })] }));
    h.engine.applyContext(context({ ownerCatalog: [module({ texts, job: job({ state: 'done', progress: 1 }) })] }));
    expect(h.transitions.map((item) => [item.name, item.state])).toEqual([['Surveillance', 'done']]);
  });

  test('a context that changes nothing does not rewrite the cache', () => {
    const h = harness();
    let writes = 0;
    const write = h.cache;
    h.engine.start('7');
    h.engine.applyContext(context({ ownerCatalog: [module()] }));
    const first = write.value;
    Object.defineProperty(write, 'value', {
      get: () => first,
      set: () => {
        writes += 1;
      },
    });
    h.engine.applyContext(context({ ownerCatalog: [module()] }));
    expect(writes).toBe(0);
  });

  test('stops listening on stop, and a new session starts clean', () => {
    const h = harness();
    h.engine.start('7');
    h.engine.stop();
    h.frame({ modules: [{ id: 'surveillance', enabled: true }] });
    h.engine.applyContext(context({ ownerCatalog: [module()] }));
    expect(h.engine.current()).toBeNull();
    h.engine.start('8');
    expect(h.engine.started).toBe(true);
  });

  test('drops a module\'s local data once for each newer purge', async () => {
    const h = harness();
    h.engine.start('7');
    h.engine.applyContext(context({ ownerCatalog: [module({ dataPurgedAt: 500 })] }));
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

  test('a failed local drop is retried on the next context', async () => {
    const h = harness();
    h.dropFails = true;
    h.engine.start('7');
    h.engine.applyContext(context({ ownerCatalog: [module({ dataPurgedAt: 500 })] }));
    await settle();
    await h.engine.reconcilePurges();
    expect(h.stamps['7']).toBeUndefined();
    h.dropFails = false;
    h.engine.applyContext(context({ ownerCatalog: [module({ dataPurgedAt: 500 })] }));
    await h.engine.reconcilePurges();
    expect(h.stamps['7']).toEqual({ surveillance: 500 });
  });
});
