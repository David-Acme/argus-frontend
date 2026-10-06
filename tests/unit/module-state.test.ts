import { describe, expect, test } from 'bun:test';
import {
  applyFrame,
  bytesToFetch,
  enabledModuleIds,
  installPlan,
  isModuleEnabled,
  jobTransitions,
  mergeJob,
  moduleOfApiPath,
  moduleOfAppRoute,
  needsPolling,
  optimisticPatch,
  purgeDecision,
  syncTablesOf,
  replaceCatalog,
  requiredBy,
} from '@/core/services/modules/module-state';
import type { ModuleCatalog, ModuleJob, ModuleRecord } from '@/core/types';

const job = (patch: Partial<ModuleJob> = {}): ModuleJob => ({
  id: '7',
  kind: 'install',
  state: 'downloading',
  progress: 0.4,
  bytesDone: 400,
  bytesTotal: 1000,
  bytesPerSecond: 50,
  etaSeconds: 12,
  reason: null,
  owner: null,
  ...patch,
});

const module = (patch: Partial<ModuleRecord> = {}): ModuleRecord => ({
  id: 'surveillance',
  name: 'Vigilancia',
  summary: 'Cámaras',
  kind: 'available',
  lifecycle: 'not_installed',
  enabled: false,
  hasData: false,
  dataPurgedAt: null,
  requires: ['core'],
  sizeBytes: 1000,
  installedBytes: 0,
  hardware: { verdict: 'ok', reasons: [], minRamMb: 4096, recommendedRamMb: 8192, freeDiskMb: 50_000 },
  job: null,
  gettingStarted: [],
  components: [],
  detailed: true,
  ...patch,
});

const core = module({ id: 'core', name: 'Núcleo', kind: 'core', enabled: true, requires: [], sizeBytes: 0 });

const catalog = (modules: ModuleRecord[]): ModuleCatalog => ({ supported: true, fetchedAt: 1, modules });

describe('job progress never goes backwards', () => {
  test('an older answer for the same job keeps the larger progress', () => {
    const merged = mergeJob(job({ progress: 0.6, bytesDone: 600 }), job({ progress: 0.5, bytesDone: 500 }));
    expect(merged?.progress).toBe(0.6);
    expect(merged?.bytesDone).toBe(600);
  });

  test('a new job starts from its own numbers', () => {
    expect(mergeJob(job({ progress: 0.9 }), job({ id: '8', progress: 0.1 }))?.progress).toBe(0.1);
  });

  test('a finished job is not reopened by a stale answer, and done means 100 %', () => {
    const done = mergeJob(job(), job({ state: 'done', progress: 0.98 }));
    expect(done?.progress).toBe(1);
    expect(mergeJob(done, job({ state: 'downloading', progress: 0.5 }))?.state).toBe('done');
  });

  test('a failure is taken as the server says it', () => {
    expect(mergeJob(job({ progress: 0.7 }), job({ state: 'failed', progress: 0.2, reason: 'network' }))).toEqual(
      job({ state: 'failed', progress: 0.2, reason: 'network' })
    );
  });

  test('replacing the catalog merges the job of each module', () => {
    const previous = catalog([module({ job: job({ progress: 0.8, bytesDone: 800 }) })]);
    const next = replaceCatalog(previous, [module({ job: job({ progress: 0.3, bytesDone: 300 }) })], 5);
    expect(next.modules[0]?.job?.progress).toBe(0.8);
    expect(next.fetchedAt).toBe(5);
  });

  test('a brief answer never erases details already known', () => {
    const brief = module({ summary: '', hardware: null, detailed: false, enabled: true });
    const next = replaceCatalog(catalog([module()]), [brief], 2);
    expect(next.modules[0]?.summary).toBe('Cámaras');
    expect(next.modules[0]?.enabled).toBe(true);
  });
});

describe('live frames', () => {
  test('a module frame updates one module and keeps the rest', () => {
    const next = applyFrame(catalog([core, module()]), { kind: 'module', module: module({ job: job() }) }, 3);
    expect(next.modules.map((item) => item.id)).toEqual(['core', 'surveillance']);
    expect(next.modules[1]?.job?.state).toBe('downloading');
  });

  test('an enabled-set frame flips flags and learns unknown modules', () => {
    const next = applyFrame(
      catalog([core, module()]),
      { kind: 'enabled', version: 1, modules: [{ id: 'surveillance', enabled: true }, { id: 'productivity', enabled: true }] },
      3
    );
    expect(next.modules.find((item) => item.id === 'surveillance')?.enabled).toBe(true);
    expect(next.modules.find((item) => item.id === 'productivity')?.detailed).toBe(false);
  });
});

describe('the enabled set', () => {
  test('is unknown until the server answered, so nothing is hidden', () => {
    expect(enabledModuleIds(null)).toBeNull();
    expect(enabledModuleIds({ supported: false, fetchedAt: 0, modules: [] })).toBeNull();
    expect(isModuleEnabled(null, 'surveillance')).toBe(true);
  });

  test('holds the core and the enabled modules', () => {
    const enabled = enabledModuleIds(catalog([core, module(), module({ id: 'productivity', enabled: true })]));
    expect([...(enabled ?? [])].sort()).toEqual(['core', 'productivity']);
    expect(isModuleEnabled(enabled, 'surveillance')).toBe(false);
  });

  test('maps API paths and app routes to their module', () => {
    expect(moduleOfApiPath('/camera/3/snapshot')).toBe('surveillance');
    expect(moduleOfApiPath('/visitor-crop/x/content')).toBe('surveillance');
    expect(moduleOfApiPath('/calendar-event-share')).toBe('productivity');
    expect(moduleOfApiPath('/auth/status')).toBeNull();
    expect(moduleOfAppRoute('/cameras/4')).toBe('surveillance');
    expect(moduleOfAppRoute('/users/visitors')).toBe('surveillance');
    expect(moduleOfAppRoute('/users')).toBeNull();
    expect(moduleOfAppRoute('/agenda?new=event')).toBe('productivity');
  });
});

describe('polling', () => {
  test('only while a job runs and the socket is down', () => {
    const running = catalog([module({ job: job() })]);
    expect(needsPolling(running, false)).toBe(true);
    expect(needsPolling(running, true)).toBe(false);
    expect(needsPolling(catalog([module({ job: job({ state: 'paused' }) })]), false)).toBe(false);
    expect(needsPolling(catalog([module({ job: job({ state: 'done' }) })]), false)).toBe(false);
  });
});

describe('transitions', () => {
  test('report a job that finished or failed while it was followed', () => {
    const before = catalog([module({ job: job() })]);
    expect(jobTransitions(before, catalog([module({ job: job({ state: 'done' }) })]))).toEqual([
      { id: 'surveillance', name: 'Vigilancia', kind: 'install', state: 'done', reason: null, owner: null },
    ]);
    expect(jobTransitions(before, catalog([module({ job: job({ state: 'failed', reason: 'disk_full' }) })]))).toEqual([
      { id: 'surveillance', name: 'Vigilancia', kind: 'install', state: 'failed', reason: 'disk_full', owner: null },
    ]);
  });

  test('stay quiet on the first answer and on a job already finished', () => {
    expect(jobTransitions(null, catalog([module({ job: job({ state: 'done' }) })]))).toEqual([]);
    const done = catalog([module({ job: job({ state: 'done' }) })]);
    expect(jobTransitions(done, done)).toEqual([]);
  });
});

describe('dependencies', () => {
  const reports = module({ id: 'reports', name: 'Informes', requires: ['surveillance'] });
  const all = catalog([core, module(), reports, module({ id: 'agronomy', kind: 'coming_soon' })]);

  test('are resolved and installed first, without the core', () => {
    expect(installPlan(all, ['reports'])).toEqual({ order: ['surveillance', 'reports'], added: ['surveillance'], blocked: [] });
  });

  test('skip what is already on or installing', () => {
    const installing = catalog([core, module({ job: job() }), reports]);
    expect(installPlan(installing, ['reports']).order).toEqual(['reports']);
  });

  test('refuse coming soon, unknown and insufficient modules', () => {
    expect(installPlan(all, ['agronomy', 'nope']).blocked).toEqual(['agronomy', 'nope']);
    const weak = catalog([core, module({ hardware: { verdict: 'insufficient', reasons: [], minRamMb: 0, recommendedRamMb: 0, freeDiskMb: 0 } }), reports]);
    expect(installPlan(weak, ['reports'])).toEqual({ order: [], added: [], blocked: ['reports'] });
  });

  test('survive a cycle in the catalog', () => {
    const a = module({ id: 'a', requires: ['b'] });
    const b = module({ id: 'b', requires: ['a'] });
    expect(installPlan(catalog([a, b]), ['a']).blocked).toEqual(['a']);
  });

  test('name what an enabled module needs and count the bytes left', () => {
    const on = catalog([core, module({ enabled: true }), module({ id: 'reports', enabled: true, requires: ['surveillance'] })]);
    expect(requiredBy(on, 'surveillance').map((item) => item.id)).toEqual(['reports']);
    expect(bytesToFetch(catalog([module({ installedBytes: 250 })]), ['surveillance'])).toBe(750);
  });
});

describe('optimistic patches', () => {
  test('show the intent of each action at once', () => {
    expect(optimisticPatch(module(), 'install').job?.state).toBe('queued');
    expect(optimisticPatch(module({ job: job() }), 'pause').job?.state).toBe('paused');
    expect(optimisticPatch(module({ job: job({ state: 'paused' }) }), 'resume').job?.state).toBe('queued');
    expect(optimisticPatch(module({ job: job() }), 'cancel').job?.state).toBe('cancelled');
    expect(optimisticPatch(module({ enabled: true }), 'disable')).toEqual({ enabled: false, lifecycle: 'disabled' });
    expect(optimisticPatch(module({ enabled: true }), 'uninstall').job?.state).toBe('queued');
  });

  test('an install keeps the progress of an open job', () => {
    expect(optimisticPatch(module({ job: job({ state: 'paused', progress: 0.5 }) }), 'install').job?.progress).toBe(0.5);
  });
});

describe('local purge', () => {
  test('drops a module whose purge is newer than the one this device applied', () => {
    const purged = catalog([module({ dataPurgedAt: 900 }), module({ id: 'productivity', dataPurgedAt: 100 })]);
    expect(purgeDecision(purged, { productivity: 100 })).toEqual({
      drop: ['surveillance'],
      stamps: { productivity: 100, surveillance: 900 },
    });
    expect(purgeDecision(purged, { surveillance: 900, productivity: 100 }).drop).toEqual([]);
    expect(purgeDecision(catalog([module()]), {}).drop).toEqual([]);
  });

  test('every role learns a purge: from its brief list or from an enabled-set frame', () => {
    const brief = module({ detailed: false, summary: '', hardware: null, dataPurgedAt: 700 });
    expect(purgeDecision(replaceCatalog(null, [brief], 1), {}).drop).toEqual(['surveillance']);
    const framed = applyFrame(
      catalog([module({ detailed: false })]),
      { kind: 'enabled', version: null, modules: [{ id: 'surveillance', enabled: false, dataPurgedAt: 800 }] },
      2
    );
    expect(framed.modules[0]?.dataPurgedAt).toBe(800);
    expect(purgeDecision(framed, { surveillance: 700 }).drop).toEqual(['surveillance']);
    const older = applyFrame(framed, { kind: 'enabled', version: null, modules: [{ id: 'surveillance', enabled: false }] }, 3);
    expect(older.modules[0]?.dataPurgedAt).toBe(800);
  });

  test('a brief answer keeps the newest purge stamp it knew', () => {
    const next = replaceCatalog(catalog([module({ dataPurgedAt: 900 })]), [module({ detailed: false, dataPurgedAt: 100 })], 4);
    expect(next.modules[0]?.dataPurgedAt).toBe(900);
  });

  test('maps modules to the synced tables they own', () => {
    expect(syncTablesOf(['surveillance', 'core'])).toEqual(['camera', 'camera_stream', 'zone', 'event']);
    expect(syncTablesOf(['productivity'])).toContain('calendar_event_share');
  });
});
