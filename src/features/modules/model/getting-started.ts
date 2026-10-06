import { isJobOpen } from '@/core/services/modules/module-state';
import type { ModuleCatalog } from '@/core/types';

export type ChecklistItem = {
  id: string;
  moduleId: string;
  title: string;
  hint: string;
  route: string | null;
  done: boolean;
};

export type ChecklistState = {
  hidden: string[];
  done: string[];
};

export const EMPTY_CHECKLIST: ChecklistState = { hidden: [], done: [] };

export const CHOOSE_MODULES_ID = 'app:choose-modules';

export function readChecklistState(value: unknown): ChecklistState {
  if (!value || typeof value !== 'object') return EMPTY_CHECKLIST;
  const record = value as { hidden?: unknown; done?: unknown };
  const ids = (list: unknown) =>
    Array.isArray(list) ? list.filter((id): id is string => typeof id === 'string') : [];
  return { hidden: ids(record.hidden), done: ids(record.done) };
}

export function needsModuleChoice(catalog: ModuleCatalog | null): boolean {
  if (!catalog?.supported) return false;
  const available = catalog.modules.filter((module) => module.kind === 'available');
  return available.length > 0 && available.every((module) => !module.enabled && !isJobOpen(module.job));
}

export type ChecklistOptions = {
  owner: boolean;
  chooseTitle: string;
  chooseHint: string;
  chooseRoute: string;
};

export function checklistItems(
  catalog: ModuleCatalog | null,
  state: ChecklistState,
  options: ChecklistOptions
): ChecklistItem[] {
  const done = new Set(state.done);
  const choose: ChecklistItem[] =
    options.owner && needsModuleChoice(catalog)
      ? [
          {
            id: CHOOSE_MODULES_ID,
            moduleId: 'core',
            title: options.chooseTitle,
            hint: options.chooseHint,
            route: options.chooseRoute,
            done: done.has(CHOOSE_MODULES_ID),
          },
        ]
      : [];
  const steps = (catalog?.modules ?? [])
    .filter((module) => module.enabled)
    .flatMap((module) =>
      module.gettingStarted.map((step) => ({
        id: step.id,
        moduleId: module.id,
        title: step.title,
        hint: step.hint,
        route: step.route,
        done: done.has(step.id),
      }))
    );
  const hidden = new Set(state.hidden);
  return [...choose, ...steps].filter((item) => !hidden.has(item.id));
}

export const checklistVisible = (items: readonly ChecklistItem[]): boolean => items.some((item) => !item.done);

export const dismissChecklist = (state: ChecklistState, items: readonly ChecklistItem[]): ChecklistState => ({
  ...state,
  hidden: [...new Set([...state.hidden, ...items.map((item) => item.id)])],
});

export function markDone(state: ChecklistState, id: string): ChecklistState {
  return state.done.includes(id) ? state : { ...state, done: [...state.done, id] };
}
