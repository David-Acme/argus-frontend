import { describe, expect, test } from 'bun:test';
import { knownModuleText, localizedModule } from '@/core/services/modules/module-text';
import { projectGettingStarted } from '@/core/services/view-cache/getting-started.projection';
import type { ModuleCatalog, ModuleRecord } from '@/core/types';
import { VIEW_CACHE_KEYS } from '@/shared/constants';
import {
  EMPTY_CHECKLIST,
  EMPTY_SIGNALS,
  checklistItems,
  completedBySignals,
  stepIdOf,
  withSignals,
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

const OPTIONS = { owner: true, chooseTitle: '', chooseHint: '', chooseRoute: '/settings/modules' };

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

  test('signals add to what the person marked by hand and keep the hidden list', () => {
    const state = { hidden: ['meet-argus'], done: ['guard-mode'] };
    const merged = withSignals(state, { ...EMPTY_SIGNALS, cameras: 1 });
    expect(merged.done).toEqual(['guard-mode', 'add-camera']);
    expect(merged.hidden).toEqual(['meet-argus']);
    expect(withSignals(EMPTY_CHECKLIST, EMPTY_SIGNALS)).toBe(EMPTY_CHECKLIST);
  });

  test('the catalog prefixes each step with its module, and the signals still tick it', () => {
    const state = withSignals(EMPTY_CHECKLIST, {
      ...EMPTY_SIGNALS,
      cameras: 1,
      events: 2,
      argusTalks: 3,
    });
    const done = checklistItems(SERVER_CATALOG, state, OPTIONS)
      .filter((item) => item.done)
      .map((item) => item.id);
    expect(done).toEqual(['core:meet-argus', 'surveillance:add-camera', 'productivity:first-event']);
  });

  test('a step marked by its bare id from another screen is ticked', () => {
    const items = checklistItems(SERVER_CATALOG, { hidden: [], done: ['guard-mode'] }, OPTIONS);
    expect(items.find((item) => item.id === 'surveillance:guard-mode')?.done).toBe(true);
    expect(stepIdOf('surveillance:guard-mode')).toBe('guard-mode');
    expect(stepIdOf('guard-mode')).toBe('guard-mode');
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
