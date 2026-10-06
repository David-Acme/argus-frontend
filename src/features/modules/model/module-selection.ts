import { bytesToFetch, installPlan, isJobOpen, type InstallPlan } from '@/core/services/modules/module-state';
import type { ModuleCatalog, ModuleRecord } from '@/core/types';
import { MODULE_DISK_HEADROOM } from '@/shared/constants';

export const isChoosable = (module: ModuleRecord): boolean =>
  module.kind === 'available' &&
  !module.enabled &&
  !isJobOpen(module.job) &&
  module.hardware?.verdict !== 'insufficient';

export const isPending = (module: ModuleRecord): boolean => module.kind === 'available' && isJobOpen(module.job);

export const isRecommended = (module: ModuleRecord): boolean =>
  isChoosable(module) && (module.hardware === null || module.hardware.verdict === 'ok');

export function defaultSelection(catalog: ModuleCatalog | null): string[] {
  return (catalog?.modules ?? []).filter(isRecommended).map((module) => module.id);
}

const byId = (catalog: ModuleCatalog | null) => new Map((catalog?.modules ?? []).map((module) => [module.id, module]));

function requirementsOf(catalog: ModuleCatalog | null, id: string, seen = new Set<string>()): string[] {
  const module = byId(catalog).get(id);
  if (!module || seen.has(id)) return [];
  seen.add(id);
  return module.requires.flatMap((required) => [required, ...requirementsOf(catalog, required, seen)]);
}

export function toggleModule(catalog: ModuleCatalog | null, selection: readonly string[], id: string): string[] {
  const modules = byId(catalog);
  const target = modules.get(id);
  if (!target || !isChoosable(target)) return [...selection];
  if (selection.includes(id)) {
    return selection.filter(
      (chosen) => chosen !== id && !requirementsOf(catalog, chosen).includes(id)
    );
  }
  const additions = [id, ...requirementsOf(catalog, id)].filter((candidate) => {
    const module = modules.get(candidate);
    return module !== undefined && isChoosable(module) && !selection.includes(candidate);
  });
  return [...selection, ...new Set(additions)];
}

export type SelectionSummary = {
  plan: InstallPlan;
  bytes: number;
  freeDiskMb: number | null;
  fits: boolean;
};

export function selectionSummary(catalog: ModuleCatalog | null, selection: readonly string[]): SelectionSummary {
  const plan = installPlan(catalog, selection);
  const free = (catalog?.modules ?? [])
    .map((module) => module.hardware?.freeDiskMb)
    .find((value): value is number => typeof value === 'number' && value > 0);
  const bytes = bytesToFetch(catalog, plan.order);
  const freeDiskMb = free ?? null;
  const fits = freeDiskMb === null || (bytes * MODULE_DISK_HEADROOM) / (1024 * 1024) <= freeDiskMb;
  return { plan, bytes, freeDiskMb, fits };
}

export const unmetRequirements = (catalog: ModuleCatalog | null, module: ModuleRecord): string[] => {
  const modules = byId(catalog);
  return module.requires.filter((id) => {
    const required = modules.get(id);
    return required !== undefined && required.kind !== 'core' && !required.enabled;
  });
};

const KIND_ORDER: Readonly<Record<ModuleRecord['kind'], number>> = { core: 0, available: 1, coming_soon: 2 };

export const sortModules = (modules: readonly ModuleRecord[]): ModuleRecord[] =>
  modules
    .map((module, index) => ({ module, index }))
    .sort((a, b) => KIND_ORDER[a.module.kind] - KIND_ORDER[b.module.kind] || a.index - b.index)
    .map(({ module }) => module);

export function addedByOf(
  catalog: ModuleCatalog | null,
  selection: readonly string[],
  id: string
): string[] {
  if (!selection.includes(id)) return [];
  return selection.filter((chosen) => chosen !== id && requirementsOf(catalog, chosen).includes(id));
}
