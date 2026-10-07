import { describe, expect, test } from 'bun:test';
import { localeDictionaries } from '@/core/i18n/locales';
import { translate } from '@/core/i18n/translate';
import type { ModuleCatalog, ModuleJob, ModuleRecord, TranslateFn } from '@/core/types';
import {
  blockMessage,
  dataSummary,
  holdsData,
  lifecycleButtons,
  lifecycleCopy,
  pinStep,
  purgeReady,
  retryBody,
  typedNameMatches,
  uninstallBlock,
  uninstallMode,
} from '@/features/modules/model/module-lifecycle';

const es = ((key: string, params?: Record<string, string>) =>
  translate(localeDictionaries.es, key as never, params as never)) as TranslateFn;
const en = ((key: string, params?: Record<string, string>) =>
  translate(localeDictionaries.en, key as never, params as never)) as TranslateFn;

const module = (patch: Partial<ModuleRecord> = {}): ModuleRecord => ({
  id: 'surveillance',
  name: 'Vigilancia',
  summary: '',
  texts: null,
  intro: null,
  roles: [],
  kind: 'available',
  lifecycle: 'active',
  enabled: true,
  hasData: false,
  dataPurgedAt: null,
  requires: [],
  sizeBytes: 10,
  installedBytes: 10,
  hardware: null,
  job: null,
  gettingStarted: [],
  components: [],
  detailed: true,
  ...patch,
});

const job = (state: ModuleJob['state']): ModuleJob => ({
  id: '1',
  kind: 'install',
  state,
  progress: 0.5,
  bytesDone: 5,
  bytesTotal: 10,
  bytesPerSecond: 1,
  etaSeconds: 5,
  reason: null,
  owner: null,
  roleMoves: [],
  roleMovesNote: null,
});

const catalog = (modules: ModuleRecord[]): ModuleCatalog => ({ fetchedAt: 0, modules });
const choices = (record: ModuleRecord) => lifecycleButtons(record).map((button) => `${button.choice}:${button.action}`);

describe('lifecycle wording', () => {
  test('each of the four states reads clearly, and kept data is said out loud', () => {
    expect(es(lifecycleCopy('not_installed').label)).toBe('No instalado');
    expect(es(lifecycleCopy('active').label)).toBe('Activo');
    expect(es(lifecycleCopy('disabled').label)).toBe('Desactivado · tus datos se conservan');
    expect(es(lifecycleCopy('uninstalled_data_kept').label)).toBe('Desinstalado · tus datos se conservan');
    expect(en(lifecycleCopy('uninstalled_data_kept').hint ?? 'screens.modules.title')).toBe(
      'Reinstall it and your data comes back.'
    );
    expect(lifecycleCopy('active').hint).toBeNull();
  });
});

describe('lifecycle actions', () => {
  test('active offers Desactivar and Desinstalar; disabled offers Activar at once', () => {
    expect(choices(module())).toEqual(['uninstall:uninstall', 'disable:disable']);
    expect(choices(module({ lifecycle: 'disabled', enabled: false }))).toEqual(['uninstall:uninstall', 'enable:install']);
  });

  test('uninstalled with data offers reinstall and erasing; not installed offers install', () => {
    expect(choices(module({ lifecycle: 'uninstalled_data_kept', enabled: false }))).toEqual([
      'erase:uninstall',
      'reinstall:install',
    ]);
    expect(choices(module({ lifecycle: 'not_installed', enabled: false }))).toEqual(['install:install']);
    expect(
      choices(
        module({
          lifecycle: 'not_installed',
          enabled: false,
          hardware: { verdict: 'insufficient', reasons: [], minRamMb: 0, recommendedRamMb: 0, freeDiskMb: 0 },
        })
      )
    ).toEqual([]);
  });

  test('a job takes over the actions, and core or coming soon have none', () => {
    expect(choices(module({ job: job('downloading') }))).toEqual(['cancel:cancel', 'pause:pause']);
    expect(choices(module({ job: job('paused') }))).toEqual(['cancel:cancel', 'resume:resume']);
    expect(choices(module({ job: job('failed') }))).toEqual(['cancel:cancel', 'retry:install']);
    expect(choices(module({ job: { ...job('failed'), kind: 'uninstall' } }))).toEqual(['cancel:cancel', 'retry:uninstall']);
    expect(choices(module({ job: { ...job('failed'), kind: 'purge' } }))).toEqual(['cancel:cancel', 'retry:uninstall']);
    expect(choices(module({ job: job('done') }))).toEqual(['uninstall:uninstall', 'disable:disable']);
    expect(choices(module({ kind: 'core' }))).toEqual([]);
    expect(choices(module({ kind: 'coming_soon' }))).toEqual([]);
  });
});

describe('uninstall rules', () => {
  test('core, a module others need and a running job are refused before asking', () => {
    expect(uninstallBlock(null, module({ kind: 'core' }))).toEqual({ kind: 'core' });
    const reports = module({ id: 'reports', name: 'Informes', requires: ['surveillance'] });
    const block = uninstallBlock(catalog([module(), reports]), module());
    expect(block).toEqual({ kind: 'required', names: 'Informes' });
    expect(blockMessage({ kind: 'required', names: 'Informes' }, es)).toBe(
      'Primero desactiva Informes: lo necesita para funcionar.'
    );
    expect(uninstallBlock(null, module({ job: job('downloading') }))).toEqual({ kind: 'busy' });
    expect(uninstallBlock(catalog([module()]), module())).toBeNull();
  });

  test('without data it is one confirmation, with data a choice, after a kept uninstall an erase', () => {
    const owner = { owner: 'camera', reachable: true, reported: true };
    expect(uninstallMode(module(), [])).toBe('simple');
    expect(uninstallMode(module(), [{ ...owner, items: [{ kind: 'camera', count: 0 }], bytes: 0 }])).toBe('simple');
    expect(uninstallMode(module({ hasData: true }), [])).toBe('choose');
    expect(uninstallMode(module(), [{ ...owner, items: [], bytes: 2048 }])).toBe('choose');
    expect(uninstallMode(module(), [{ ...owner, reachable: false, items: [], bytes: 0 }])).toBe('choose');
    expect(uninstallMode(module(), [{ ...owner, reported: false, items: [], bytes: 0 }])).toBe('choose');
    expect(uninstallMode(module(), null)).toBe('choose');
    expect(uninstallMode(module({ lifecycle: 'uninstalled_data_kept' }), null)).toBe('erase');
    expect(holdsData(module(), null)).toBe(false);
  });

  test('purging needs the module name typed, ignoring case, accents and spaces around it', () => {
    expect(typedNameMatches('  vigilancia ', 'Vigilancia')).toBe(true);
    expect(typedNameMatches('Productividad', 'Productívidad')).toBe(true);
    expect(typedNameMatches('Vigilanci', 'Vigilancia')).toBe(false);
    expect(typedNameMatches('', '')).toBe(false);
    expect(purgeReady({ typed: 'vigilancia', name: 'Vigilancia' })).toBe(true);
    expect(purgeReady({ typed: 'otra', name: 'Vigilancia' })).toBe(false);
  });

  test('what a module holds is summed per kind across owners, in plain words', () => {
    const owner = (name: string, items: { kind: string; count: number }[], bytes = 0) => ({
      owner: name,
      reachable: true,
      reported: true,
      items,
      bytes,
    });
    const owners = [
      owner('camera', [
        { kind: 'cameras', count: 3 },
        { kind: 'zones', count: 1 },
        { kind: 'evidence_photos', count: 40 },
        { kind: 'camera_actions', count: 0 },
      ], 2 * 1024 ** 3),
      owner('guard', [
        { kind: 'evidence_photos', count: 88 },
        { kind: 'episodes', count: 12 },
        { kind: 'mystery', count: 2 },
      ], 104_857_600),
      owner('sync', [{ kind: 'change_history', count: 1 }]),
    ];
    expect(dataSummary(owners, 'es', es)).toEqual([
      '3 cámaras',
      '1 zona',
      '128 fotos de evidencia',
      '12 visitas registradas',
      '1 cambio en el historial',
      '2 elementos',
      'aprox. 2,1 GB en la base de datos',
    ]);
    expect(
      dataSummary(
        [
          owner('identity', [{ kind: 'visitors', count: 1 }, { kind: 'visitor_face_samples', count: 4 }, { kind: 'visits', count: 1200 }]),
          owner('productivity', [{ kind: 'projects', count: 2 }, { kind: 'calendar_shares', count: 1 }]),
        ],
        'en',
        en
      )
    ).toEqual(['1 person seen', '4 saved visitor faces', '1,200 visitor passes', '2 projects', '1 shared event']);
  });

  test('every documented kind has a label in both languages', () => {
    const kinds = [
      'cameras', 'zones', 'evidence_photos', 'camera_actions', 'environments', 'episodes', 'incidents', 'decisions',
      'expected_guests', 'visitors', 'visitor_face_samples', 'visits', 'projects', 'tasks', 'project_members',
      'calendar_events', 'calendar_shares', 'change_history',
    ];
    for (const kind of kinds) {
      const items = [{ owner: 'x', reachable: true, reported: true, items: [{ kind, count: 2 }], bytes: 0 }];
      expect(dataSummary(items, 'es', es)[0]).not.toContain('elementos');
      expect(dataSummary(items, 'en', en)[0]).not.toContain('items');
    }
  });

  test('the dialog says what is always kept, and sync has a friendly name', () => {
    expect(es('screens.modules.data.kept')).toContain('recordatorios');
    expect(en('screens.modules.data.kept')).toContain('panic');
  });
});

describe('retry and PIN', () => {
  test('a retry repeats the kind of the job that failed', () => {
    expect(retryBody({ ...job('failed'), kind: 'purge' })).toEqual({ keepData: false });
    expect(retryBody({ ...job('failed'), kind: 'uninstall' })).toEqual({ keepData: true });
    expect(retryBody(job('failed'))).toBeNull();
    expect(retryBody(null)).toBeNull();
  });

  test('the server decides when a PIN is needed', () => {
    expect(pinStep('PIN_REQUIRED')).toBe('prompt');
    expect(pinStep('PIN_INVALID')).toBe('invalid');
    expect(pinStep('PIN_LOCKED')).toBe('locked');
    expect(pinStep('MODULE_REQUIRED_BY')).toBe('refused');
    expect(pinStep(undefined)).toBe('refused');
  });

  test('pin copy explains a wrong code, a lock and that the name is enough without a PIN', () => {
    expect(es('screens.modules.uninstall.pin-invalid')).toBe('Ese código no es correcto. Inténtalo otra vez.');
    expect(en('screens.modules.uninstall.pin-locked')).toBe('Too many attempts with the code. Wait a few minutes and try again.');
    expect(es('screens.modules.uninstall.pin-needed')).toContain('escribir el nombre basta');
  });
});
