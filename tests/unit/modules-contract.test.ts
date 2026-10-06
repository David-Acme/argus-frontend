import { describe, expect, test } from 'bun:test';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { readModuleActionResult, readModuleData, readModuleFrame, readModuleList } from '@/core/contracts/modules.contract';
import { MODULE_API_PREFIXES } from '@/shared/constants';

const wireModule = {
  id: 'surveillance',
  name: 'Vigilancia',
  summary: 'Cámaras, alertas y visitantes',
  kind: 'available',
  enabled: false,
  requires: ['core'],
  sizeBytes: 2_400_000_000,
  installedBytes: 0,
  hardware: { verdict: 'slow', reasons: ['ram_below_recommended'], minRamMb: 4096, recommendedRamMb: 8192, freeDiskMb: 51_200 },
  job: {
    id: 12,
    state: 'downloading',
    progress: 0.42,
    bytesDone: 1_000_000_000,
    bytesTotal: 2_400_000_000,
    bytesPerSecond: 4_000_000,
    etaSeconds: 350,
    reason: null,
    owner: null,
  },
  gettingStarted: ['Conecta tu primera cámara', { id: 'zones', title: 'Dibuja una zona', hint: 'Marca la puerta', route: '/cameras' }],
  components: [
    {
      id: 'detector',
      owner: 'camera',
      source: 'provisioned',
      reachable: true,
      reported: true,
      state: 'missing',
      bytesPresent: 0,
      bytesTotal: 10,
      ready: false,
      hostCommand: 'scripts/setup.sh --yolo',
      reason: null,
    },
  ],
};

describe('module contract', () => {
  test('reads the owner catalog with its job, hardware, steps and components', () => {
    const [module] = readModuleList([wireModule]) ?? [];
    expect(module?.job?.id).toBe('12');
    expect(module?.job?.progress).toBe(0.42);
    expect(module?.hardware?.verdict).toBe('slow');
    expect(module?.gettingStarted.map((step) => step.id)).toEqual(['surveillance:0', 'surveillance:zones']);
    expect(module?.gettingStarted[1]?.route).toBe('/cameras');
    expect(module?.components[0]?.hostCommand).toBe('scripts/setup.sh --yolo');
    expect(module?.detailed).toBe(true);
  });

  test('reads the lifecycle, or derives it from older answers', () => {
    const [kept] = readModuleList([{ ...wireModule, lifecycle: 'uninstalled_data_kept', hasData: true, dataPurgedAt: 0 }]) ?? [];
    expect(kept?.lifecycle).toBe('uninstalled_data_kept');
    expect(kept?.hasData).toBe(true);
    expect(kept?.dataPurgedAt).toBeNull();
    const [derived] = readModuleList([{ ...wireModule, enabled: false, installedBytes: 5 }]) ?? [];
    expect(derived?.lifecycle).toBe('disabled');
    expect(readModuleList([{ ...wireModule, dataPurgedAt: 1759700000 }])?.[0]?.dataPurgedAt).toBe(1759700000);
    expect(readModuleList([{ ...wireModule, lifecycle: 'gone' }])).toBeNull();
  });

  test('reads what a module holds, bare or wrapped', () => {
    const owners = [{ owner: 'camera', reachable: true, reported: true, items: [{ kind: 'camera', count: 3 }], bytes: 10 }];
    expect(readModuleData(owners)).toEqual(owners);
    expect(readModuleData({ owners })).toEqual(owners);
    expect(readModuleData({ owners: [{ owner: 'guard', reachable: false, reported: true, items: [], bytes: 0 }] })?.[0]?.reachable).toBe(false);
    expect(readModuleData({ nope: 1 })).toBeNull();
  });

  test('matches the documented owner shape: removal states, failing owner, unreadable disk', () => {
    const [module] =
      readModuleList({
        modules: [
          {
            ...wireModule,
            hardware: { ...wireModule.hardware, freeDiskMb: null },
            job: { ...wireModule.job, kind: 'uninstall', state: 'failed', reason: 'remove_unsupported', owner: 'vlm', etaSeconds: null },
          },
        ],
      }) ?? [];
    expect(module?.hardware?.freeDiskMb).toBeNull();
    expect(module?.job).toMatchObject({ kind: 'uninstall', state: 'failed', reason: 'remove_unsupported', owner: 'vlm' });
    expect(readModuleList([{ ...wireModule, job: { ...wireModule.job, kind: 'purge', state: 'purging' } }])?.[0]?.job?.state).toBe('purging');
    expect(readModuleList([{ ...wireModule, job: { ...wireModule.job, state: 'removing' } }])?.[0]?.job?.state).toBe('removing');
  });

  test('job kind defaults to install and is kept for uninstall and purge', () => {
    expect(readModuleList([wireModule])?.[0]?.job?.kind).toBe('install');
    expect(readModuleList([{ ...wireModule, job: { ...wireModule.job, kind: 'purge' } }])?.[0]?.job?.kind).toBe('purge');
  });

  test('non-owners get lifecycle and the purge stamp, also as a frame', () => {
    const [brief] = readModuleList([{ id: 'surveillance', name: 'Vigilancia', enabled: false, lifecycle: 'uninstalled_data_kept', dataPurgedAt: 1759700000 }]) ?? [];
    expect(brief?.lifecycle).toBe('uninstalled_data_kept');
    expect(brief?.dataPurgedAt).toBe(1759700000);
    expect(brief?.detailed).toBe(false);
    const frame = readModuleFrame({ id: 'surveillance', name: 'Vigilancia', enabled: false, lifecycle: 'not_installed', dataPurgedAt: 1759700001 });
    expect(frame?.kind === 'module' ? frame.module.dataPurgedAt : null).toBe(1759700001);
    const flags = readModuleFrame({ modules: [{ id: 'surveillance', enabled: false, dataPurgedAt: 5 }] });
    expect(flags?.kind === 'enabled' ? flags.modules[0]?.dataPurgedAt : null).toBe(5);
  });

  test('reads the brief list other roles get', () => {
    const modules = readModuleList([{ id: 'core', name: 'Núcleo', enabled: true }, { id: 'productivity', name: 'Agenda', enabled: false }]);
    expect(modules?.map((module) => [module.id, module.kind, module.enabled, module.detailed])).toEqual([
      ['core', 'core', true, false],
      ['productivity', 'available', false, false],
    ]);
  });

  test('accepts a wrapped list and normalizes odd job numbers', () => {
    const [module] =
      readModuleList({ modules: [{ ...wireModule, job: { ...wireModule.job, progress: 1.4, etaSeconds: -1, reason: '' } }] }) ?? [];
    expect(module?.job?.progress).toBe(1);
    expect(module?.job?.etaSeconds).toBeNull();
    expect(module?.job?.reason).toBeNull();
  });

  test('refuses what is not a module list', () => {
    expect(readModuleList(null)).toBeNull();
    expect(readModuleList([{ id: 'Bad Id', name: 'x', enabled: true }])).toBeNull();
    expect(readModuleList([{ ...wireModule, kind: 'plugin' }])).toBeNull();
  });

  test('reads both module_update frames', () => {
    expect(readModuleFrame(wireModule)?.kind).toBe('module');
    expect(readModuleFrame({ module: wireModule })?.kind).toBe('module');
    expect(readModuleFrame({ modules: [{ id: 'surveillance', enabled: true }] })).toEqual({
      kind: 'enabled',
      modules: [{ id: 'surveillance', enabled: true }],
      version: null,
    });
    expect(readModuleFrame({ kind: 'enabled', version: 4, settled: true, at: 1, modules: [] })).toEqual({
      kind: 'enabled',
      modules: [],
      version: 4,
    });
    expect(readModuleFrame({ settled: false, modules: [{ id: 'surveillance', enabled: true }] })).toBeNull();
    expect(readModuleFrame({ nothing: true })).toBeNull();
  });

  test('reads an action answer as a job or a module', () => {
    const asJob = readModuleActionResult(wireModule.job);
    expect(asJob && 'state' in asJob && !('lifecycle' in asJob)).toBe(true);
    const asModule = readModuleActionResult({ module: wireModule });
    expect(asModule && 'lifecycle' in asModule).toBe(true);
  });
});

describe('module intro and roles', () => {
  const read = (patch: Record<string, unknown>) => readModuleList([{ ...wireModule, ...patch }])?.[0];

  test('a module without intro or roles reads as having neither', () => {
    expect(read({})?.intro).toBeNull();
    expect(read({})?.roles).toEqual([]);
  });

  test('an intro is one text, one body or a body per language', () => {
    expect(read({ intro: 'Cuida la casa' })?.intro).toEqual({ any: { what: 'Cuida la casa', examples: [] } });
    expect(read({ intro: { what: 'Cuida la casa', examples: ['Ver el patio', ' ', 3] } })?.intro).toEqual({
      any: { what: 'Cuida la casa', examples: ['Ver el patio'] },
    });
    expect(
      read({ intro: { es: { what: 'Cuida', examples: ['a'] }, en: { what: 'Watches', examples: ['b'] } } })?.intro
    ).toEqual({ es: { what: 'Cuida', examples: ['a'] }, en: { what: 'Watches', examples: ['b'] } });
    expect(read({ intro: { es: {}, en: 4 } })?.intro).toBeNull();
  });

  test('roles are the names the module brings and anything else is dropped', () => {
    expect(read({ roles: ['guard'] })?.roles).toEqual(['guard']);
    expect(read({ roles: 'guard' })?.roles).toEqual([]);
  });

  test('names and summaries per language keep both texts and read the first as the default', () => {
    const module = read({ name: { es: 'Vigilancia', en: 'Surveillance' }, summary: { en: 'Cameras' } });
    expect(module?.name).toBe('Vigilancia');
    expect(module?.summary).toBe('Cameras');
    expect(module?.texts).toEqual({ name: { es: 'Vigilancia', en: 'Surveillance' }, summary: { en: 'Cameras' } });
    expect(read({})?.texts).toBeNull();
  });
});

const roleAccess = join(import.meta.dir, '../../../backend/packages/lib/auth/src/auth/role-access.hxx');
const header = existsSync(roleAccess) ? readFileSync(roleAccess, 'utf8') : '';

describe('gated API prefixes match the backend', () => {
  test.skipIf(!header.includes('kModuleRoutes'))('kModuleRoutes', () => {
    const body = header.slice(header.indexOf('kModuleRoutes'), header.indexOf('}};', header.indexOf('kModuleRoutes')));
    const constants = Object.fromEntries(
      [...header.matchAll(/inline constexpr std::string_view (\w+) = "([a-z-]+)";/g)].map(([, name, value]) => [name, value])
    );
    const backend: Record<string, string[]> = {};
    for (const [, segment = '', moduleName = ''] of body.matchAll(/\.segment = "([a-z-]+)", \.module = (\w+)/g)) {
      const id = constants[moduleName] ?? moduleName;
      backend[id] = [...(backend[id] ?? []), segment];
    }
    expect(backend).toEqual(Object.fromEntries(Object.entries(MODULE_API_PREFIXES).map(([id, list]) => [id, [...list]])));
  });
});
