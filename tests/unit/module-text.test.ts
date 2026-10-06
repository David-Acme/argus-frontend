import { describe, expect, test } from 'bun:test';
import { localeDictionaries } from '@/core/i18n/locales';
import { translate } from '@/core/i18n/translate';
import type { ModuleJob, ModuleRecord, TranslateFn } from '@/core/types';
import {
  etaOf,
  failureKey,
  formatBytes,
  hardwareReasonText,
  hostCommands,
  jobLabelKey,
  moduleStatus,
  percentOf,
  progressFacts,
  progressLine,
} from '@/features/modules/model/module-text';

const es = ((key: string, params?: Record<string, string>) => translate(localeDictionaries.es, key as never, params as never)) as TranslateFn;
const en = ((key: string, params?: Record<string, string>) => translate(localeDictionaries.en, key as never, params as never)) as TranslateFn;

const job = (patch: Partial<ModuleJob> = {}): ModuleJob => ({
  id: '1',
  kind: 'install',
  state: 'downloading',
  progress: 0.426,
  bytesDone: 1_288_490_189,
  bytesTotal: 3_006_477_107,
  bytesPerSecond: 4_404_019,
  etaSeconds: 390,
  reason: null,
  ...patch,
});

const module = (patch: Partial<ModuleRecord> = {}): ModuleRecord => ({
  id: 'surveillance',
  name: 'Vigilancia',
  summary: '',
  kind: 'available',
  lifecycle: 'not_installed',
  enabled: false,
  hasData: false,
  dataPurgedAt: null,
  requires: [],
  sizeBytes: 100,
  installedBytes: 40,
  hardware: null,
  job: null,
  gettingStarted: [],
  components: [],
  detailed: true,
  ...patch,
});

describe('sizes, speed and time read like people talk', () => {
  test('bytes in the reader language', () => {
    expect(formatBytes(1_288_490_189, 'es')).toBe('1,2 GB');
    expect(formatBytes(1_288_490_189, 'en')).toBe('1.2 GB');
    expect(formatBytes(15 * 1024 ** 3, 'en')).toBe('15 GB');
    expect(formatBytes(340 * 1024 ** 2, 'es')).toBe('340 MB');
    expect(formatBytes(-5, 'en')).toBe('0 B');
  });

  test('percent floors so it never claims 100 before the end', () => {
    expect(percentOf(0.999)).toBe(99);
    expect(percentOf(2)).toBe(100);
    expect(progressFacts(job({ state: 'done', progress: 0.97 }), 'es').percent).toBe(100);
  });

  test('time left in friendly buckets', () => {
    expect(etaOf(null)).toBeNull();
    expect(etaOf(0)).toBeNull();
    expect(etaOf(42)).toEqual({ unit: 'seconds', count: 0 });
    expect(etaOf(390)).toEqual({ unit: 'minutes', count: 7 });
    expect(etaOf(5400)).toEqual({ unit: 'hours', count: 2 });
  });

  test('a running download says state, amount, speed and time left', () => {
    expect(progressLine(job(), 'es', es)).toBe('Descargando · 1,2 GB de 2,8 GB · 4 MB/s · Quedan unos 7 min');
    expect(progressLine(job(), 'en', en)).toBe('Downloading · 1.2 GB of 2.8 GB · 4 MB/s · about 7 min left');
  });

  test('a paused or verifying job drops speed and time', () => {
    expect(progressLine(job({ state: 'paused' }), 'es', es)).toBe('En pausa · 1,2 GB de 2,8 GB');
    expect(progressLine(job({ state: 'verifying', bytesTotal: 0 }), 'en', en)).toBe('Verifying files');
  });
});

describe('job wording follows its kind', () => {
  test('uninstall and purge jobs say what they do', () => {
    expect(progressLine(job({ kind: 'purge', state: 'activating', bytesTotal: 0 }), 'es', es)).toBe('Borrando tus datos');
    expect(es(jobLabelKey({ kind: 'uninstall', state: 'failed' }))).toBe('No se pudo desinstalar');
    expect(en(jobLabelKey({ kind: 'purge', state: 'done' }))).toBe('Data deleted');
    expect(es(jobLabelKey({ kind: 'purge', state: 'paused' }))).toBe('En pausa');
    expect(es(jobLabelKey({ kind: 'install', state: 'failed' }))).toBe('No se pudo instalar');
  });
});

describe('reasons become human sentences', () => {
  test('known failure codes have their own message, the rest a calm one', () => {
    expect(failureKey('disk_full')).toBe('screens.modules.failure.disk_full');
    expect(failureKey('Checksum-Mismatch')).toBe('screens.modules.failure.checksum_mismatch');
    expect(failureKey('owner_unreachable')).toBe('screens.modules.failure.owner_unreachable');
    expect(failureKey('E_WEIRD')).toBe('screens.modules.failure.unknown');
    expect(failureKey(null)).toBe('screens.modules.failure.unknown');
  });

  test('hardware reasons carry the numbers, sentences pass through, bare codes are dropped', () => {
    const hardware = { verdict: 'slow' as const, reasons: [], minRamMb: 4096, recommendedRamMb: 8192, freeDiskMb: 512 };
    expect(hardwareReasonText('ram_below_recommended', hardware, 'es', es)).toBe(
      'Con menos de 8 GB de memoria irá más despacio.'
    );
    expect(hardwareReasonText('disk_insufficient', hardware, 'en', en)).toBe('Not enough disk space: 512 MB left.');
    expect(hardwareReasonText('La CPU no tiene AVX2', hardware, 'es', es)).toBe('La CPU no tiene AVX2');
    expect(hardwareReasonText('mystery_code', hardware, 'es', es)).toBe('');
  });
});

describe('module status', () => {
  test('follows kind, job and verdict', () => {
    expect(moduleStatus(module({ kind: 'core' }))).toBe('core');
    expect(moduleStatus(module({ kind: 'coming_soon' }))).toBe('coming-soon');
    expect(moduleStatus(module({ job: job() }))).toBe('installing');
    expect(moduleStatus(module({ job: job({ state: 'paused' }) }))).toBe('paused');
    expect(moduleStatus(module({ job: job({ state: 'failed' }) }))).toBe('failed');
    expect(moduleStatus(module({ enabled: true, job: job({ state: 'done' }) }))).toBe('enabled');
    expect(
      moduleStatus(module({ hardware: { verdict: 'insufficient', reasons: [], minRamMb: 0, recommendedRamMb: 0, freeDiskMb: 0 } }))
    ).toBe('blocked');
    expect(moduleStatus(module())).toBe('available');
  });


  test('host commands are shown only for provisioned parts not ready yet', () => {
    const component = { id: 'detector', owner: 'camera', state: 'missing', bytesPresent: 0, bytesTotal: 1, hostCommand: 'x' };
    expect(
      hostCommands(
        module({
          components: [
            { ...component, source: 'provisioned', ready: false },
            { ...component, id: 'vision', source: 'download', ready: false, hostCommand: 'y' },
            { ...component, id: 'done', source: 'provisioned', ready: true, hostCommand: 'z' },
          ],
        })
      )
    ).toEqual(['x']);
  });
});
