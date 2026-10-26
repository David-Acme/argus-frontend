import { describe, expect, test } from 'bun:test';
import { settingsOverviewSchema, settingsProfilesSchema } from '@/core/contracts/http.contract';
import type { Setting, SettingsOverview, SettingsOwner } from '@/core/types';
import {
  exportOwner,
  exportText,
  isChanged,
  ownerStatus,
  pendingRestartKeys,
  planImport,
  SETTINGS_EXPORT_FORMAT,
} from '@/features/settings/model/settings-catalog';
import {
  advancedOf,
  basicOf,
  changedOf,
  matchingOwners,
  reachableCount,
  searchSettings,
  serviceOwners,
  summaryOf,
} from '@/features/settings/model/services';
import {
  currentProfileId,
  isProfileLevel,
  levelFraction,
  profileLineOf,
} from '@/features/settings/model/profile-meters';

function numeric(
  key: string,
  value: string,
  fallback: string,
  extra: Partial<Setting> = {}
): Setting {
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
    numeric('tts.threads', '4', '0', {
      type: 'integer',
      apply: 'restart',
      pendingRestart: true,
      unit: 'threads',
    }),
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
  settings: [
    numeric('vision.gpu_layers', '-1', '-1', { type: 'integer', apply: 'restart', unit: 'layers' }),
  ],
};

const overview: SettingsOverview = {
  owners: [
    tts,
    vlm,
    { service: 'stt', reachable: false, settings: [] },
    { service: 'guard', reachable: false, configured: false, settings: [] },
  ],
};

const SEARCH = {
  describe: (key: string) => ({
    label: key === 'tts.speed' ? 'Velocidad al hablar' : '',
    hint: '',
  }),
  ownerName: (owner: SettingsOwner) => (owner.service === 'tts' ? 'Voz de Argus' : owner.service),
};

describe('settings catalog model', () => {
  test('a value differs from its default by its type, not its spelling', () => {
    expect(isChanged(tts.settings[0]!)).toBe(false);
    expect(isChanged(tts.settings[1]!)).toBe(true);
    expect(isChanged(tts.settings[2]!)).toBe(false);
    expect(isChanged(numeric('x.y', '', '0'))).toBe(true);
  });

  test('owners are connected, not answering or not connected at all', () => {
    expect(overview.owners.map(ownerStatus)).toEqual([
      'connected',
      'connected',
      'unreachable',
      'unconfigured',
    ]);
    expect(pendingRestartKeys(tts)).toEqual(['tts.threads']);
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
      settings: {
        'tts.speed': '1.25',
        'tts.threads': '8',
        'tts.engine_es': 'supertonic',
        'tts.gone': '1',
        'tts.bad': 3,
      },
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
    expect(planImport(exportText(vlm, new Date()), tts)).toEqual({
      ok: false,
      reason: 'wrongService',
      service: 'vlm',
    });
    expect(planImport(exportText(tts, new Date()), tts)).toEqual({
      ok: false,
      reason: 'nothingToChange',
    });
    const many = Object.fromEntries(
      Array.from({ length: 70 }, (_, index) => [`tts.k${index}`, '1'])
    );
    const wide: SettingsOwner = {
      ...tts,
      settings: Object.keys(many).map((key) => numeric(key, '0', '0')),
    };
    expect(
      planImport(
        JSON.stringify({ format: SETTINGS_EXPORT_FORMAT, service: 'tts', settings: many }),
        wide
      )
    ).toEqual({
      ok: false,
      reason: 'tooMany',
    });
  });

  test('the contracts accept the technical fields and an older answer without them', () => {
    expect(settingsOverviewSchema.safeParse(overview).success).toBe(true);
    expect(
      settingsOverviewSchema.safeParse({
        owners: [
          {
            ...tts,
            profile: {
              id: 'quality',
              origin: 'recommended',
              appliedAt: 1759500000,
              keys: ['tts.speed'],
            },
          },
        ],
      }).success
    ).toBe(true);
    expect(
      settingsOverviewSchema.safeParse({
        owners: [{ ...tts, profile: { id: 'x', origin: 'auto', appliedAt: 1, keys: [] } }],
      }).success
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
        firstRun: {
          profile: 'quality',
          state: 'applied',
          appliedAt: 1,
          owners: [{ service: 'vlm', keys: ['vision.gpu_layers'] }],
        },
      }).success
    ).toBe(true);
  });
});

describe('the services of Ajustes', () => {
  test('services follow the human order, and one that is not connected at all is hidden', () => {
    expect(serviceOwners(overview).map((owner) => owner.service)).toEqual(['tts', 'stt', 'vlm']);
    expect(reachableCount(serviceOwners(overview))).toBe(2);
  });

  test('main and advanced options split by level, and the changed ones are known', () => {
    expect(basicOf(tts).map((setting) => setting.key)).toEqual(['tts.speed', 'tts.engine_es']);
    expect(advancedOf(tts).map((setting) => setting.key)).toEqual(['tts.threads']);
    expect(changedOf(tts).map((setting) => setting.key)).toEqual(['tts.threads']);
  });

  test('a summary reads the voice first, else the main choices, never a bare number', () => {
    expect(summaryOf(tts).map((setting) => setting.key)).toEqual(['tts.engine_es']);
    expect(summaryOf({ ...tts, service: 'llm' }).map((setting) => setting.key)).toEqual([
      'tts.engine_es',
    ]);
    expect(summaryOf(vlm)).toEqual([]);
  });

  test('search reads the key, the label and the service name, without accents', () => {
    const keys = (query: string) =>
      searchSettings(overview.owners, query, SEARCH).map((match) => match.setting.key);
    expect(keys('velocidad')).toEqual(['tts.speed']);
    expect(keys('VOZ argus speed')).toEqual(['tts.speed']);
    expect(keys('gpu_layers')).toEqual(['vision.gpu_layers']);
    expect(keys('nothing-like-this')).toEqual([]);
    expect(keys('  ')).toEqual([]);
  });

  test('a service stays in the list when its name or one of its options matches', () => {
    const services = (query: string) =>
      matchingOwners([tts, vlm], query, SEARCH).map((owner) => owner.service);
    expect(services('')).toEqual(['tts', 'vlm']);
    expect(services('voz')).toEqual(['tts']);
    expect(services('gpu')).toEqual(['vlm']);
  });
});

describe('how Argus works', () => {
  const profiles = (current: string | null, recommended = 'balanced') =>
    ({
      profiles: ['performance', 'balanced', 'quality'].map((id) => ({
        id,
        labelKey: id,
        current: id === current,
        owners: [],
      })),
      recommendation: { profile: recommended },
    }) as never;

  test('the line says whether the chosen profile is the recommended one', () => {
    expect(profileLineOf(profiles('balanced'))).toBe('recommended');
    expect(profileLineOf(profiles('quality'))).toBe('other');
    expect(profileLineOf(profiles(null))).toBe('custom');
    expect(currentProfileId(profiles('quality'))).toBe('quality');
  });

  test('the meters rank the three known profiles and nothing else', () => {
    expect(isProfileLevel('balanced')).toBe(true);
    expect(isProfileLevel('custom')).toBe(false);
    expect(levelFraction('performance')).toBeCloseTo(1 / 3);
    expect(levelFraction('quality')).toBe(1);
  });
});
