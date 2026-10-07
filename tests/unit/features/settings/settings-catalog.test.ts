import { describe, expect, test } from 'bun:test';
import { settingsOverviewSchema, settingsProfilesSchema } from '@/core/contracts/http.contract';
import type { Setting, SettingsOverview, SettingsOwner } from '@/core/types';
import {
  disconnectedOwners,
  exportOwner,
  exportText,
  isChanged,
  overviewCounts,
  ownerStatus,
  planImport,
  SETTINGS_EXPORT_FORMAT,
  technicalGroups,
  type TechnicalRow,
} from '@/features/settings/model/settings-catalog';

function numeric(key: string, value: string, fallback: string, extra: Partial<Setting> = {}): Setting {
  return {
    key,
    group: 'engine',
    type: 'decimal',
    level: 'advanced',
    apply: 'live',
    min: 0,
    max: 2,
    step: 0.05,
    choices: [],
    value,
    fallback,
    ...extra,
  };
}

const tts: SettingsOwner = {
  service: 'tts',
  reachable: true,
  configured: true,
  configFile: '/srv/argus/argus-deploy/config.tts.toml',
  capabilities: [],
  profile: null,
  settings: [
    numeric('tts.speed', '1.250', '1.25', { level: 'basic', unit: 'x' }),
    numeric('tts.threads', '4', '0', { type: 'integer', apply: 'restart', pendingRestart: true, unit: 'threads' }),
    {
      key: 'tts.engine_es',
      group: 'engine',
      type: 'choice',
      level: 'basic',
      apply: 'live',
      min: 0,
      max: 0,
      step: 0,
      choices: ['pocket', 'supertonic'],
      value: 'pocket',
      fallback: 'pocket',
    },
  ],
};

const vlm: SettingsOwner = {
  service: 'vlm',
  reachable: true,
  settings: [numeric('vision.gpu_layers', '-1', '-1', { type: 'integer', apply: 'restart', unit: 'layers' })],
};

const overview: SettingsOverview = {
  owners: [
    tts,
    vlm,
    { service: 'stt', reachable: false, settings: [] },
    { service: 'guard', reachable: false, configured: false, settings: [] },
  ],
};

const describeRow = (row: TechnicalRow) => ({ label: row.setting.key === 'tts.speed' ? 'Velocidad al hablar' : '', hint: '' });
const nameOf = (owner: SettingsOwner) => (owner.service === 'tts' ? 'Voz de Argus' : owner.service);

describe('settings catalog model', () => {
  test('a value differs from its default by its type, not its spelling', () => {
    expect(isChanged(tts.settings[0]!)).toBe(false);
    expect(isChanged(tts.settings[1]!)).toBe(true);
    expect(isChanged(tts.settings[2]!)).toBe(false);
    expect(isChanged(numeric('x.y', '', '0'))).toBe(true);
  });

  test('owners are connected, not answering or not connected at all', () => {
    expect(overview.owners.map(ownerStatus)).toEqual(['connected', 'connected', 'unreachable', 'unconfigured']);
    expect(disconnectedOwners(overview).map((owner) => owner.service)).toEqual(['stt', 'guard']);
    expect(overviewCounts(overview)).toEqual({ total: 4, changed: 1, pending: 1 });
  });

  test('search reads the key, the label, the hint and the service name, without accents', () => {
    const search = (query: string) =>
      technicalGroups(overview, { query, service: 'all', changed: false, restart: false }, describeRow, nameOf)
        .flatMap((group) => group.rows.map((row) => row.setting.key));
    expect(search('velocidad')).toEqual(['tts.speed']);
    expect(search('VOZ argus speed')).toEqual(['tts.speed']);
    expect(search('gpu_layers')).toEqual(['vision.gpu_layers']);
    expect(search('nothing-like-this')).toEqual([]);
  });

  test('filters keep the changed keys, the restart keys or one service, and empty owners stay only unfiltered', () => {
    const groups = (changed: boolean, restart: boolean, service: 'all' | 'vlm' = 'all') =>
      technicalGroups(overview, { query: '', service, changed, restart }, describeRow, nameOf);
    expect(groups(false, false).map((group) => group.owner.service)).toEqual(['tts', 'vlm', 'stt', 'guard']);
    expect(groups(true, false).flatMap((group) => group.rows.map((row) => row.setting.key))).toEqual(['tts.threads']);
    expect(groups(false, true).flatMap((group) => group.rows.map((row) => row.setting.key))).toEqual([
      'tts.threads',
      'vision.gpu_layers',
    ]);
    expect(groups(false, false, 'vlm').map((group) => group.owner.service)).toEqual(['vlm']);
  });

  test('an export carries every value of one service and nothing else', () => {
    const exported = exportOwner(tts, new Date('2026-10-03T12:00:00Z'));
    expect(exported).toEqual({
      format: SETTINGS_EXPORT_FORMAT,
      service: 'tts',
      exportedAt: '2026-10-03T12:00:00.000Z',
      settings: { 'tts.speed': '1.250', 'tts.threads': '4', 'tts.engine_es': 'pocket' },
    });
  });

  test('an import changes only known keys whose value differs, and refuses what it cannot apply', () => {
    const text = JSON.stringify({
      format: SETTINGS_EXPORT_FORMAT,
      service: 'tts',
      settings: { 'tts.speed': '1.25', 'tts.threads': '8', 'tts.engine_es': 'supertonic', 'tts.gone': '1', 'tts.bad': 3 },
    });
    expect(planImport(text, tts)).toEqual({
      ok: true,
      changes: [
        { key: 'tts.threads', value: '8' },
        { key: 'tts.engine_es', value: 'supertonic' },
      ],
      unchanged: 1,
      unknown: ['tts.gone', 'tts.bad'],
    });
    expect(planImport('{', tts)).toEqual({ ok: false, reason: 'notJson' });
    expect(planImport('{"service":"tts"}', tts)).toEqual({ ok: false, reason: 'wrongFormat' });
    expect(planImport(exportText(vlm, new Date()), tts)).toEqual({ ok: false, reason: 'wrongService', service: 'vlm' });
    expect(planImport(exportText(tts, new Date()), tts)).toEqual({ ok: false, reason: 'nothingToChange' });
    const many = Object.fromEntries(Array.from({ length: 70 }, (_, index) => [`tts.k${index}`, '1']));
    const wide: SettingsOwner = {
      ...tts,
      settings: Object.keys(many).map((key) => numeric(key, '0', '0')),
    };
    expect(planImport(JSON.stringify({ format: SETTINGS_EXPORT_FORMAT, service: 'tts', settings: many }), wide)).toEqual({
      ok: false,
      reason: 'tooMany',
    });
  });

  test('the contracts accept the technical fields and an older answer without them', () => {
    expect(settingsOverviewSchema.safeParse(overview).success).toBe(true);
    expect(
      settingsOverviewSchema.safeParse({
        owners: [{ ...tts, profile: { id: 'quality', origin: 'recommended', appliedAt: 1759500000, keys: ['tts.speed'] } }],
      }).success
    ).toBe(true);
    expect(
      settingsOverviewSchema.safeParse({ owners: [{ ...tts, profile: { id: 'x', origin: 'auto', appliedAt: 1, keys: [] } }] })
        .success
    ).toBe(false);
    const profiles = {
      profiles: [],
      recommendation: {
        profile: 'quality',
        reason: 'meets',
        hardware: { cores: 8, threads: 16, ramGb: 30.7, isa: 'avx2', gpu: 'vaapi' },
        rule: null,
        missed: null,
        rules: [],
        fallback: 'performance',
      },
    };
    expect(settingsProfilesSchema.safeParse(profiles).success).toBe(true);
    expect(
      settingsProfilesSchema.safeParse({
        ...profiles,
        firstRun: { profile: 'quality', state: 'applied', appliedAt: 1, owners: [{ service: 'vlm', keys: ['vision.gpu_layers'] }] },
      }).success
    ).toBe(true);
  });
});
