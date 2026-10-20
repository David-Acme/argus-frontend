import { describe, expect, test } from 'bun:test';
import { knownModuleText, localizedModule } from '@/core/services/modules/module-text';
import { projectGettingStarted } from '@/core/services/view-cache/getting-started.projection';
import type { ModuleCatalog, ModuleRecord } from '@/core/types';
import { VIEW_CACHE_KEYS } from '@/shared/constants';
import {
  EMPTY_CHECKLIST,
  EMPTY_SIGNALS,
  checklistItems,
  chosenGuardModes,
  completedBySignals,
  stepIdOf,
} from '@/features/modules/model/getting-started';

const record = (id: string, steps: readonly string[], patch: Partial<ModuleRecord> = {}): ModuleRecord => ({
  id,
  name: id === 'core' ? 'Asistente y hogar' : 'Vigilancia',
  summary: '',
  texts: null,
  intro: null,
  roles: [],
  kind: id === 'core' ? 'core' : 'available',
  lifecycle: 'active',
  enabled: true,
  hasData: false,
  dataPurgedAt: null,
  requires: [],
  sizeBytes: 0,
  installedBytes: 0,
  hardware: null,
  job: null,
  gettingStarted: steps.map((step) => ({ id: `${id}:${step}`, title: `server ${step}`, hint: '', route: '/' })),
  components: [],
  detailed: true,
  ...patch,
});

const SERVER_CATALOG: ModuleCatalog = {
  fetchedAt: 0,
  modules: [
    record('core', ['meet-argus', 'invite-people']),
    record('surveillance', ['add-camera', 'draw-zone', 'guard-mode']),
    record('productivity', ['first-event', 'first-project']),
  ],
};

const OPTIONS = {
  owner: true,
  chooseTitle: '',
  chooseHint: '',
  chooseRoute: '/settings/modules',
  assistantHref: '/call',
  evidence: new Set<string>(),
};

describe('getting-started steps follow the household data', () => {
  test('nothing is done in an empty household', () => {
    expect([...completedBySignals(EMPTY_SIGNALS)]).toEqual([]);
  });

  test('a camera, a zone, an event and a project complete their steps on any device', () => {
    const done = completedBySignals({ ...EMPTY_SIGNALS, cameras: 1, zones: 2, events: 3, projects: 1 });
    expect([...done].sort()).toEqual(['add-camera', 'draw-zone', 'first-event', 'first-project']);
  });

  test('the owner alone has not invited anyone; a second person or an invitation has', () => {
    expect(completedBySignals({ ...EMPTY_SIGNALS, people: 1 }).has('invite-people')).toBe(false);
    expect(completedBySignals({ ...EMPTY_SIGNALS, people: 2 }).has('invite-people')).toBe(true);
    expect(completedBySignals({ ...EMPTY_SIGNALS, people: 1, invitations: 1 }).has('invite-people')).toBe(true);
  });

  test('the catalog prefixes each step with its module, and the evidence ticks it', () => {
    const evidence = completedBySignals({ ...EMPTY_SIGNALS, cameras: 1, events: 2, argusTalks: 3 });
    const done = checklistItems(SERVER_CATALOG, EMPTY_CHECKLIST, { ...OPTIONS, evidence })
      .filter((item) => item.done)
      .map((item) => item.id);
    expect(done).toEqual(['core:meet-argus', 'surveillance:add-camera', 'productivity:first-event']);
    expect(stepIdOf('surveillance:guard-mode')).toBe('guard-mode');
    expect(stepIdOf('guard-mode')).toBe('guard-mode');
  });

  test('a step with evidence is never ticked by a stored tap, only by the evidence', () => {
    const tapped = { hidden: [], done: ['guard-mode', 'surveillance:guard-mode'] };
    const items = checklistItems(SERVER_CATALOG, tapped, OPTIONS);
    expect(items.find((item) => item.id === 'surveillance:guard-mode')?.done).toBe(false);
    const chosen = completedBySignals({ ...EMPTY_SIGNALS, guardModes: 1 });
    const ticked = checklistItems(SERVER_CATALOG, EMPTY_CHECKLIST, { ...OPTIONS, evidence: chosen });
    expect(ticked.find((item) => item.id === 'surveillance:guard-mode')?.done).toBe(true);
  });

  test('a guard mode counts as chosen once an environment has a mode change on record', () => {
    expect(chosenGuardModes(null)).toBe(0);
    expect(chosenGuardModes([{ modeUpdatedAt: 0 }])).toBe(0);
    expect(chosenGuardModes([{ modeUpdatedAt: 0 }, { modeUpdatedAt: 1792511727 }])).toBe(1);
    expect(completedBySignals({ ...EMPTY_SIGNALS, guardModes: 0 }).has('guard-mode')).toBe(false);
  });

  test('a step the app cannot verify nor open is the only one a tap marks', () => {
    const garden = record('garden', [], {
      gettingStarted: [{ id: 'garden:water', title: 'Riega', hint: '', route: '/garden' }],
    });
    const catalog: ModuleCatalog = { fetchedAt: 0, modules: [...SERVER_CATALOG.modules, garden] };
    const items = checklistItems(catalog, { hidden: [], done: ['garden:water'] }, OPTIONS);
    const water = items.find((item) => item.id === 'garden:water');
    expect(water?.manual).toBe(true);
    expect(water?.route).toBeNull();
    expect(water?.done).toBe(true);
    expect(items.filter((item) => item.manual).map((item) => item.id)).toEqual(['garden:water']);
  });

  test('the module choice is not ticked by tapping it; it leaves when modules are chosen', () => {
    const fresh: ModuleCatalog = {
      fetchedAt: 0,
      modules: [record('core', []), record('surveillance', [], { enabled: false })],
    };
    const items = checklistItems(fresh, { hidden: [], done: ['app:choose-modules'] }, OPTIONS);
    expect(items.map((item) => [item.id, item.done, item.manual])).toEqual([['app:choose-modules', false, false]]);
  });

  test('a talk with Argus completes meeting Argus', () => {
    expect(completedBySignals({ ...EMPTY_SIGNALS, argusTalks: 1 }).has('meet-argus')).toBe(true);
    expect(completedBySignals({ ...EMPTY_SIGNALS, argusTalks: 0 }).has('meet-argus')).toBe(false);
  });

  test('a known step reads in the app language, an unknown one keeps the server words', () => {
    const titles: Record<string, string> = { 'add-camera': 'Add your first camera' };
    const items = checklistItems(SERVER_CATALOG, EMPTY_CHECKLIST, {
      ...OPTIONS,
      stepTitle: (stepId) => titles[stepId] ?? null,
    });
    expect(items.find((item) => item.id === 'surveillance:add-camera')?.title).toBe('Add your first camera');
    expect(items.find((item) => item.id === 'surveillance:draw-zone')?.title).toBe('server draw-zone');
  });

  test('a module the server named in one language reads in the app language', () => {
    const spanish = record('surveillance', []);
    expect(localizedModule(spanish, 'en').name).toBe('Surveillance');
    expect(localizedModule(record('core', []), 'en').name).toBe('Assistant and home');
    expect(localizedModule(spanish, 'es').name).toBe('Vigilancia');
    expect(localizedModule(record('garden', [], { name: 'Jardín' }), 'en').name).toBe('Jardín');
    expect(knownModuleText('garden', 'en')).toBeNull();
  });

  test('the view-cache payload carries exactly the model signal shape', () => {
    const writes = projectGettingStarted({
      cameras: [1],
      zones: [1, 2],
      events: 3,
      projects: [1],
      people: [1, 2],
      invitations: [1],
      argusTalks: 2,
    });
    const write = writes.find((item) => item.key === VIEW_CACHE_KEYS.gettingStartedSignals);
    if (!write || !('value' in write)) throw new Error('no getting-started signals written');
    expect(Object.keys(write.value as object).sort()).toEqual(Object.keys(EMPTY_SIGNALS).sort());
    expect(write.value).toEqual({
      cameras: 1,
      zones: 2,
      events: 3,
      projects: 1,
      people: 2,
      invitations: 1,
      argusTalks: 2,
    });
  });
});
