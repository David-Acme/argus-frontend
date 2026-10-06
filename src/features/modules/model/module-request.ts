import type { IServiceResponse } from '@/core/interfaces';
import type { ModuleRecord, ModuleRequestAnswer } from '@/core/types';
import { MODULE_IDS } from '@/shared/constants';

export type RequestOutcome = 'sent' | 'again' | 'active' | 'installing' | 'soon' | 'failed';

export function requestOutcome(response: IServiceResponse<ModuleRequestAnswer>): RequestOutcome {
  if (response.ok) return response.info?.duplicate ? 'again' : 'sent';
  if (response.errors?.code === 'MODULE_COMING_SOON') return 'soon';
  if (response.errors?.code === 'CONFLICT') return 'active';
  if (response.errors?.code === 'MODULE_JOB_RUNNING') return 'installing';
  return 'failed';
}

export type RequestedToday = Readonly<Record<string, string>>;

export const requestDay = (now: Date): string =>
  `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

export const wasRequestedToday = (requested: RequestedToday, moduleId: string, today: string): boolean =>
  requested[moduleId] === today;

export function withRequest(requested: RequestedToday, moduleId: string, today: string): RequestedToday {
  const kept = Object.fromEntries(Object.entries(requested).filter(([, day]) => day === today));
  return { ...kept, [moduleId]: today };
}

export function requestableModules(modules: readonly ModuleRecord[], hidden: ReadonlySet<string>): ModuleRecord[] {
  return modules.filter(
    (module) =>
      module.id !== MODULE_IDS.core &&
      module.kind !== 'core' &&
      module.kind !== 'coming_soon' &&
      !module.enabled &&
      !hidden.has(module.id)
  );
}
