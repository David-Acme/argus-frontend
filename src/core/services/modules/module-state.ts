import type {
  ModuleAction,
  ModuleCatalog,
  ModuleEnabledFlag,
  ModuleFrame,
  ModuleJob,
  ModuleJobState,
  ModuleRecord,
  ModuleTransition,
  SyncTableKey,
} from '@/core/types';
import { MODULE_API_PREFIXES, MODULE_APP_ROUTES, MODULE_IDS, MODULE_SYNC_TABLES } from '@/shared/constants';

const RUNNING: ReadonlySet<ModuleJobState> = new Set([
  'queued',
  'checking',
  'downloading',
  'verifying',
  'activating',
  'health_check',
  'removing',
  'purging',
]);

const TERMINAL: ReadonlySet<ModuleJobState> = new Set(['done', 'failed', 'cancelled']);

export const isJobRunning = (job: ModuleJob | null | undefined): boolean => job != null && RUNNING.has(job.state);

export const isJobOpen = (job: ModuleJob | null | undefined): boolean => job != null && !TERMINAL.has(job.state);

export function mergeJob(previous: ModuleJob | null, next: ModuleJob | null): ModuleJob | null {
  if (!previous || !next || previous.id !== next.id) return next;
  if (previous.state === 'done' && next.state !== 'done') return previous;
  if (TERMINAL.has(next.state) && next.state !== 'done') return next;
  const bytesDone = Math.max(previous.bytesDone, next.bytesDone);
  const progress = next.state === 'done' ? 1 : Math.max(previous.progress, next.progress);
  return { ...next, bytesDone, progress };
}

const latestStamp = (left: number | null, right: number | null | undefined): number | null =>
  Math.max(left ?? 0, right ?? 0) || null;

export function mergeModule(previous: ModuleRecord | undefined, next: ModuleRecord): ModuleRecord {
  if (!previous) return next;
  if (!next.detailed && previous.detailed) {
    return {
      ...previous,
      name: next.name || previous.name,
      enabled: next.enabled,
      lifecycle: next.enabled ? 'active' : previous.lifecycle === 'active' ? 'disabled' : previous.lifecycle,
      dataPurgedAt: latestStamp(previous.dataPurgedAt, next.dataPurgedAt),
    };
  }
  return { ...next, job: mergeJob(previous.job, next.job) };
}

export function replaceCatalog(
  previous: ModuleCatalog | null,
  modules: readonly ModuleRecord[],
  now: number
): ModuleCatalog {
  const byId = new Map((previous?.modules ?? []).map((module) => [module.id, module]));
  return { supported: true, fetchedAt: now, modules: modules.map((module) => mergeModule(byId.get(module.id), module)) };
}

export const unsupportedCatalog = (now: number): ModuleCatalog => ({ supported: false, fetchedAt: now, modules: [] });

export function upsertModule(catalog: ModuleCatalog | null, module: ModuleRecord, now: number): ModuleCatalog {
  const base = catalog ?? { supported: true, fetchedAt: now, modules: [] };
  const index = base.modules.findIndex((candidate) => candidate.id === module.id);
  if (index < 0) return { ...base, supported: true, modules: [...base.modules, module] };
  const modules = base.modules.slice();
  modules[index] = mergeModule(base.modules[index], module);
  return { ...base, supported: true, modules };
}

export function applyEnabledFlags(catalog: ModuleCatalog | null, flags: readonly ModuleEnabledFlag[], now: number): ModuleCatalog {
  const base = catalog ?? { supported: true, fetchedAt: now, modules: [] };
  const byId = new Map(flags.map((flag) => [flag.id, flag.enabled]));
  const known = new Set(base.modules.map((module) => module.id));
  const stamps = new Map(flags.map((flag) => [flag.id, flag.dataPurgedAt ?? null]));
  const updated = base.modules.map((module): ModuleRecord => {
    const stamp = latestStamp(module.dataPurgedAt, stamps.get(module.id));
    const stamped = stamp === module.dataPurgedAt ? module : { ...module, dataPurgedAt: stamp };
    return byId.has(module.id) && byId.get(module.id) !== module.enabled
      ? {
          ...stamped,
          enabled: byId.get(module.id) === true,
          lifecycle: byId.get(module.id) === true ? 'active' : module.lifecycle === 'active' ? 'disabled' : module.lifecycle,
        }
      : stamped;
  });
  const added = flags
    .filter((flag) => !known.has(flag.id))
    .map(
      (flag): ModuleRecord => ({
        id: flag.id,
        name: '',
        summary: '',
        kind: flag.id === MODULE_IDS.core ? 'core' : 'available',
        lifecycle: flag.enabled ? 'active' : 'not_installed',
        enabled: flag.enabled,
        hasData: false,
        dataPurgedAt: flag.dataPurgedAt ?? null,
        requires: [],
        sizeBytes: 0,
        installedBytes: 0,
        hardware: null,
        job: null,
        gettingStarted: [],
        components: [],
        detailed: false,
      })
    );
  return { ...base, supported: true, modules: [...updated, ...added] };
}

export function applyFrame(catalog: ModuleCatalog | null, frame: ModuleFrame, now: number): ModuleCatalog {
  return frame.kind === 'module'
    ? upsertModule(catalog, frame.module, now)
    : applyEnabledFlags(catalog, frame.modules, now);
}

export function withJob(catalog: ModuleCatalog | null, moduleId: string, job: ModuleJob | null): ModuleCatalog | null {
  if (!catalog) return catalog;
  return {
    ...catalog,
    modules: catalog.modules.map((module) =>
      module.id === moduleId ? { ...module, job: job && module.job?.id === job.id ? mergeJob(module.job, job) : job } : module
    ),
  };
}

export function patchModule(
  catalog: ModuleCatalog | null,
  moduleId: string,
  patch: Partial<ModuleRecord>
): ModuleCatalog | null {
  if (!catalog) return catalog;
  return {
    ...catalog,
    modules: catalog.modules.map((module) => (module.id === moduleId ? { ...module, ...patch } : module)),
  };
}

export function enabledModuleIds(catalog: ModuleCatalog | null): ReadonlySet<string> | null {
  if (!catalog || !catalog.supported || catalog.modules.length === 0) return null;
  return new Set([MODULE_IDS.core, ...catalog.modules.filter((module) => module.enabled).map((module) => module.id)]);
}

export const isModuleEnabled = (enabled: ReadonlySet<string> | null, moduleId: string): boolean =>
  enabled === null || enabled.has(moduleId);

const segmentOf = (path: string): string => path.replace(/^\/+/, '').split(/[/?#]/)[0] ?? '';

export function moduleOfApiPath(path: string): string | null {
  const segment = segmentOf(path);
  const found = Object.entries(MODULE_API_PREFIXES).find(([, prefixes]) => prefixes.includes(segment));
  return found ? found[0] : null;
}

export function moduleOfAppRoute(pathname: string): string | null {
  const path = pathname.split(/[?#]/)[0] ?? pathname;
  const found = Object.entries(MODULE_APP_ROUTES).find(([, routes]) =>
    routes.some((route) => path === route || path.startsWith(`${route}/`))
  );
  return found ? found[0] : null;
}

export const runningModules = (catalog: ModuleCatalog | null): ModuleRecord[] =>
  (catalog?.modules ?? []).filter((module) => isJobRunning(module.job));

export const needsPolling = (catalog: ModuleCatalog | null, socketConnected: boolean): boolean =>
  !socketConnected && runningModules(catalog).length > 0;

export function jobTransitions(previous: ModuleCatalog | null, next: ModuleCatalog | null): ModuleTransition[] {
  if (!previous || !next) return [];
  const before = new Map(previous.modules.map((module) => [module.id, module.job]));
  return next.modules.flatMap((module): ModuleTransition[] => {
    const job = module.job;
    const earlier = before.get(module.id);
    if (!job || !earlier || earlier.id !== job.id || !isJobOpen(earlier)) return [];
    if (job.state !== 'done' && job.state !== 'failed') return [];
    return [{ id: module.id, name: module.name, kind: job.kind, state: job.state, reason: job.reason, owner: job.owner }];
  });
}

export type InstallPlan = {
  order: string[];
  added: string[];
  blocked: string[];
};

export function installPlan(catalog: ModuleCatalog | null, chosen: readonly string[]): InstallPlan {
  const byId = new Map((catalog?.modules ?? []).map((module) => [module.id, module]));
  const order: string[] = [];
  const blocked: string[] = [];
  const visiting = new Set<string>();
  const seen = new Set<string>();
  const visit = (id: string): boolean => {
    if (seen.has(id)) return true;
    if (visiting.has(id)) return false;
    const module = byId.get(id);
    if (!module) return false;
    if (module.kind === 'core' || module.enabled || isJobOpen(module.job)) {
      seen.add(id);
      return true;
    }
    if (module.kind === 'coming_soon' || module.hardware?.verdict === 'insufficient') return false;
    visiting.add(id);
    const ready = module.requires.every(visit);
    visiting.delete(id);
    if (!ready) return false;
    seen.add(id);
    order.push(id);
    return true;
  };
  chosen.forEach((id) => {
    if (!visit(id)) blocked.push(id);
  });
  const wanted = new Set(chosen);
  return { order, added: order.filter((id) => !wanted.has(id)), blocked };
}

export function requiredBy(catalog: ModuleCatalog | null, moduleId: string): ModuleRecord[] {
  return (catalog?.modules ?? []).filter(
    (module) => module.enabled && module.id !== moduleId && module.requires.includes(moduleId)
  );
}

export function bytesToFetch(catalog: ModuleCatalog | null, ids: readonly string[]): number {
  const wanted = new Set(ids);
  return (catalog?.modules ?? [])
    .filter((module) => wanted.has(module.id))
    .reduce((total, module) => total + Math.max(0, module.sizeBytes - module.installedBytes), 0);
}

const pendingJob = (state: ModuleJobState, previous: ModuleJob | null, kind: ModuleJob['kind'] = 'install'): ModuleJob => ({
  id: previous?.id ?? 'pending',
  kind: previous?.kind ?? kind,
  state,
  progress: previous?.progress ?? 0,
  bytesDone: previous?.bytesDone ?? 0,
  bytesTotal: previous?.bytesTotal ?? 0,
  bytesPerSecond: 0,
  etaSeconds: null,
  reason: null,
  owner: null,
});

export function optimisticPatch(module: ModuleRecord, action: ModuleAction): Partial<ModuleRecord> {
  switch (action) {
    case 'install':
      return { job: pendingJob('queued', isJobOpen(module.job) ? module.job : null) };
    case 'pause':
      return module.job ? { job: { ...module.job, state: 'paused', bytesPerSecond: 0, etaSeconds: null } } : {};
    case 'resume':
      return module.job ? { job: { ...module.job, state: 'queued' } } : {};
    case 'cancel':
      return module.job ? { job: { ...module.job, state: 'cancelled', bytesPerSecond: 0, etaSeconds: null } } : {};
    case 'disable':
      return { enabled: false, lifecycle: 'disabled' };
    case 'uninstall':
      return { job: pendingJob('queued', null, 'uninstall') };
  }
}

export type PurgeDecision = {
  drop: string[];
  stamps: Record<string, number>;
};

export function purgeDecision(catalog: ModuleCatalog | null, stored: Readonly<Record<string, number>>): PurgeDecision {
  const stamps: Record<string, number> = { ...stored };
  const drop: string[] = [];
  (catalog?.modules ?? []).forEach((module) => {
    const stamp = module.dataPurgedAt;
    if (stamp === null || stamp <= (stored[module.id] ?? 0)) return;
    drop.push(module.id);
    stamps[module.id] = stamp;
  });
  return { drop, stamps };
}

export const syncTablesOf = (moduleIds: readonly string[]): SyncTableKey[] => [
  ...new Set(
    moduleIds.flatMap((id): readonly SyncTableKey[] =>
      id in MODULE_SYNC_TABLES ? MODULE_SYNC_TABLES[id as keyof typeof MODULE_SYNC_TABLES] : []
    )
  ),
];
