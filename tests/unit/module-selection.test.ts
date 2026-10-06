import { describe, expect, test } from 'bun:test';
import type { ModuleCatalog, ModuleJob, ModuleRecord } from '@/core/types';
import {
  focusedFirst,
  addedByOf,
  defaultSelection,
  isChoosable,
  selectionSummary,
  sortModules,
  toggleModule,
  unmetRequirements,
} from '@/features/modules/model/module-selection';
import {
  CHOOSE_MODULES_ID,
  checklistItems,
  checklistVisible,
  dismissChecklist,
  EMPTY_CHECKLIST,
  markDone,
  needsModuleChoice,
  readChecklistState,
} from '@/features/modules/model/getting-started';

const hardware = (verdict: 'ok' | 'slow' | 'insufficient', freeDiskMb = 10_000) => ({
  verdict,
  reasons: [],
  minRamMb: 0,
  recommendedRamMb: 0,
  freeDiskMb,
});

const module = (patch: Partial<ModuleRecord> = {}): ModuleRecord => ({
  id: 'surveillance',
  name: 'Vigilancia',
  summary: '',
  texts: null,
  intro: null,
  roles: [],
  kind: 'available',
  lifecycle: 'not_installed',
  enabled: false,
  hasData: false,
  dataPurgedAt: null,
  requires: ['core'],
  sizeBytes: 2 * 1024 ** 3,
  installedBytes: 0,
  hardware: hardware('ok'),
  job: null,
  gettingStarted: [],
  components: [],
  detailed: true,
  ...patch,
});

const running: ModuleJob = {
  id: '1',
  kind: 'install',
  state: 'downloading',
  progress: 0.1,
  bytesDone: 1,
  bytesTotal: 10,
  bytesPerSecond: 1,
  etaSeconds: 9,
  reason: null,
  owner: null,
};

const core = module({ id: 'core', kind: 'core', enabled: true, requires: [], sizeBytes: 0, hardware: null });
const productivity = module({ id: 'productivity', name: 'Agenda', sizeBytes: 0, hardware: hardware('slow') });
const reports = module({ id: 'reports', name: 'Informes', requires: ['surveillance'], sizeBytes: 1024 ** 3 });
const agronomy = module({ id: 'agronomy', kind: 'coming_soon', sizeBytes: 0, hardware: null });
const catalog = (modules: ModuleRecord[]): ModuleCatalog => ({ fetchedAt: 0, modules });
const all = catalog([agronomy, reports, productivity, module(), core]);

describe('choosing modules', () => {
  test('preselects what the server runs well and is not on yet', () => {
    expect(defaultSelection(all)).toEqual(['reports', 'surveillance']);
  });

  test('core, coming soon, installing, enabled and insufficient modules are not choosable', () => {
    expect(isChoosable(core)).toBe(false);
    expect(isChoosable(agronomy)).toBe(false);
    expect(isChoosable(module({ job: running }))).toBe(false);
    expect(isChoosable(module({ enabled: true }))).toBe(false);
    expect(isChoosable(module({ hardware: hardware('insufficient') }))).toBe(false);
    expect(isChoosable(productivity)).toBe(true);
  });

  test('choosing a module brings what it needs, dropping one drops what needs it', () => {
    expect(toggleModule(all, [], 'reports')).toEqual(['reports', 'surveillance']);
    expect(toggleModule(all, ['reports', 'surveillance', 'productivity'], 'surveillance')).toEqual(['productivity']);
    expect(toggleModule(all, ['surveillance'], 'agronomy')).toEqual(['surveillance']);
    expect(addedByOf(all, ['reports', 'surveillance'], 'surveillance')).toEqual(['reports']);
  });

  test('the summary counts what is left to download and checks the disk', () => {
    const summary = selectionSummary(all, ['reports', 'surveillance']);
    expect(summary.plan.order).toEqual(['surveillance', 'reports']);
    expect(summary.bytes).toBe(3 * 1024 ** 3);
    expect(summary.freeDiskMb).toBe(10_000);
    expect(summary.fits).toBe(true);
    const tight = catalog([core, module({ hardware: hardware('ok', 2100) })]);
    expect(selectionSummary(tight, ['surveillance']).fits).toBe(false);
  });

  test('cards are ordered core, available, coming soon, keeping the server order inside', () => {
    expect(sortModules(all.modules).map((item) => item.id)).toEqual([
      'core',
      'reports',
      'productivity',
      'surveillance',
      'agronomy',
    ]);
  });

  test('a card names only the requirements that are still off', () => {
    expect(unmetRequirements(all, reports)).toEqual(['surveillance']);
    expect(unmetRequirements(all, module())).toEqual([]);
  });
});

describe('getting started', () => {
  const steps = module({
    enabled: true,
    gettingStarted: [
      { id: 'surveillance:0', title: 'Conecta una cámara', hint: '', route: '/cameras?new=camera' },
      { id: 'surveillance:1', title: 'Dibuja una zona', hint: '', route: null },
    ],
  });
  const options = { owner: true, chooseTitle: 'Elige', chooseHint: '', chooseRoute: '/settings/modules' };

  test('lists the steps of enabled modules only', () => {
    const items = checklistItems(catalog([core, steps, productivity]), EMPTY_CHECKLIST, options);
    expect(items.map((item) => item.id)).toEqual(['surveillance:0', 'surveillance:1']);
  });

  test('asks the owner to choose modules while only the core is on', () => {
    const fresh = catalog([core, module(), productivity]);
    expect(needsModuleChoice(fresh)).toBe(true);
    expect(checklistItems(fresh, EMPTY_CHECKLIST, options)[0]?.id).toBe(CHOOSE_MODULES_ID);
    expect(checklistItems(fresh, EMPTY_CHECKLIST, { ...options, owner: false })).toEqual([]);
    expect(needsModuleChoice(catalog([core, module({ job: running })]))).toBe(false);
    expect(needsModuleChoice(null)).toBe(false);
  });

  test('done steps stay ticked and a dismissed list returns only with new steps', () => {
    const list = catalog([core, steps]);
    let state = markDone(EMPTY_CHECKLIST, 'surveillance:0');
    expect(checklistItems(list, state, options).map((item) => item.done)).toEqual([true, false]);
    state = dismissChecklist(state, checklistItems(list, state, options));
    expect(checklistVisible(checklistItems(list, state, options))).toBe(false);
    const more = catalog([
      core,
      steps,
      module({ id: 'productivity', enabled: true, gettingStarted: [{ id: 'productivity:0', title: 'Crea un evento', hint: '', route: null }] }),
    ]);
    expect(checklistItems(more, state, options).map((item) => item.id)).toEqual(['productivity:0']);
  });

  test('a stored state is read defensively', () => {
    expect(readChecklistState(null)).toEqual(EMPTY_CHECKLIST);
    expect(readChecklistState({ hidden: ['a', 3], done: 'x' })).toEqual({ hidden: ['a'], done: [] });
  });
});

describe('the module a link points to', () => {
  const first = module({ id: 'core', kind: 'core' });
  const second = module({ id: 'surveillance' });
  const third = module({ id: 'productivity' });

  test('comes first and the others keep their order', () => {
    expect(focusedFirst([first, second, third], 'productivity').map((item) => item.id)).toEqual([
      'productivity',
      'core',
      'surveillance',
    ]);
  });

  test('an unknown or missing module changes nothing', () => {
    expect(focusedFirst([first, second], 'agronomy').map((item) => item.id)).toEqual(['core', 'surveillance']);
    expect(focusedFirst([first, second], undefined).map((item) => item.id)).toEqual(['core', 'surveillance']);
  });
});
