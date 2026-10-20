import { isJobOpen } from '@/core/services/modules/module-state';
import type { IChecklistSignalsCache } from '@/core/interfaces';
import type { ModuleCatalog } from '@/core/types';
import { checklistTarget } from './checklist-routes';

export type ChecklistItem = {
  id: string;
  moduleId: string;
  title: string;
  hint: string;
  route: string | null;
  done: boolean;
  manual: boolean;
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
  if (!catalog) return false;
  const available = catalog.modules.filter((module) => module.kind === 'available');
  return available.length > 0 && available.every((module) => !module.enabled && !isJobOpen(module.job));
}

export type ChecklistOptions = {
  owner: boolean;
  chooseTitle: string;
  chooseHint: string;
  chooseRoute: string;
  assistantHref: string | null;
  evidence: ReadonlySet<string>;
  stepTitle?: (stepId: string) => string | null;
};

export function stepIdOf(itemId: string): string {
  const separator = itemId.indexOf(':');
  return separator < 0 ? itemId : itemId.slice(separator + 1);
}

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
            done: false,
            manual: false,
          },
        ]
      : [];
  const steps = (catalog?.modules ?? [])
    .filter((module) => module.enabled)
    .flatMap((module) =>
      module.gettingStarted.map((step) => {
        const stepId = stepIdOf(step.id);
        const evidenced = EVIDENCED_STEPS.has(stepId);
        const route = checklistTarget(step.route, options.assistantHref);
        return {
          id: step.id,
          moduleId: module.id,
          title: options.stepTitle?.(stepId) ?? step.title,
          hint: step.hint,
          route,
          done: evidenced ? options.evidence.has(stepId) : done.has(step.id) || done.has(stepId),
          manual: !evidenced && route === null,
        };
      })
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

export type ChecklistSignals = IChecklistSignalsCache & { guardModes?: number };

export const EVIDENCED_STEPS: ReadonlySet<string> = new Set([
  'add-camera',
  'draw-zone',
  'first-event',
  'first-project',
  'invite-people',
  'meet-argus',
  'guard-mode',
]);

export function chosenGuardModes(environments: readonly { modeUpdatedAt: number }[] | null): number {
  return (environments ?? []).filter((environment) => environment.modeUpdatedAt > 0).length;
}

export const EMPTY_SIGNALS: ChecklistSignals = {
  cameras: 0,
  zones: 0,
  events: 0,
  projects: 0,
  people: 0,
  invitations: 0,
  argusTalks: 0,
};

export function completedBySignals(signals: ChecklistSignals): ReadonlySet<string> {
  const done = new Set<string>();
  if (signals.cameras > 0) done.add('add-camera');
  if (signals.zones > 0) done.add('draw-zone');
  if (signals.events > 0) done.add('first-event');
  if (signals.projects > 0) done.add('first-project');
  if (signals.people > 1 || signals.invitations > 0) done.add('invite-people');
  if ((signals.argusTalks ?? 0) > 0) done.add('meet-argus');
  if ((signals.guardModes ?? 0) > 0) done.add('guard-mode');
  return done;
}

