import { describe, expect, test } from 'bun:test';
import { profileApplyResultSchema, settingsProfilesSchema } from '@/core/contracts/http.contract';
import type {
  ProfileApplyResult,
  Setting,
  SettingsOverview,
  SettingsProfile,
  SettingsProfiles,
} from '@/core/types';
import { applyIntents, type OptimisticIntent } from '@/shared/libs/optimistic';
import {
  canApply,
  profileCost,
  profileIntents,
  refusedRecordIds,
  returnedCatalogs,
  SETTING_LENSES,
  settingRecordId,
  settingRows,
  withCatalogs,
  withSettingRows,
} from '@/features/settings/model/settings-profiles';

function setting(key: string, value: string): Setting {
  return {
    key,
    group: 'engine',
    type: 'choice',
    level: 'basic',
    apply: 'live',
    min: 0,
    max: 0,
    step: 0,
    choices: ['fast', 'quality'],
    value,
    fallback: 'quality',
  };
}

const overview: SettingsOverview = {
  owners: [
    { service: 'tts', reachable: true, settings: [setting('tts.pocket_variant_es', 'quality')] },
    { service: 'vlm', reachable: true, settings: [setting('vision.max_input_px', '384')] },
  ],
};

const quality: SettingsProfile = {
  id: 'quality',
  labelKey: 'quality',
  current: false,
  owners: [
    {
      service: 'tts',
      reachable: true,
      changes: [
        {
          key: 'tts.pocket_variant_es',
          from: 'fast',
          to: 'quality',
          changed: true,
          apply: 'live',
          install: { availability: 'installable', sizeMb: 672, hostCommand: '' },
        },
        {
          key: 'tts.pocket_voice_es',
          from: 'lola',
          to: 'jean',
          changed: true,
          apply: 'live',
          install: {
            availability: 'hostOnly',
            sizeMb: 30,
            hostCommand: 'services/tts/scripts/provision.sh --voice es-quality:jean',
          },
        },
        { key: 'tts.engine_es', from: 'pocket', to: 'pocket', changed: false, apply: 'live' },
      ],
    },
    {
      service: 'vlm',
      reachable: false,
      changes: [{ key: 'vision.max_input_px', from: null, to: '512', changed: true }],
    },
  ],
};

const listing: SettingsProfiles = {
  profiles: [quality],
  recommendation: {
    profile: 'quality',
    reason: 'meets',
    hardware: { cores: 8, threads: 16, ramGb: 30.7, isa: 'avx2', gpu: 'vaapi' },
    rule: { profile: 'quality', minCores: 8, minRamGb: 14, vectorIsa: true },
    missed: null,
    rules: [
      { profile: 'quality', minCores: 8, minRamGb: 14, vectorIsa: true },
      { profile: 'balanced', minCores: 4, minRamGb: 7, vectorIsa: true },
    ],
    fallback: 'performance',
  },
};

const applied: ProfileApplyResult = {
  profile: 'quality',
  summary: { applied: 1, unchanged: 1, rejected: 1, unreachable: 1 },
  owners: [
    {
      service: 'tts',
      reachable: true,
      results: [
        { key: 'tts.pocket_variant_es', from: 'fast', to: 'quality', status: 'applied' },
        {
          key: 'tts.pocket_voice_es',
          from: 'lola',
          to: 'jean',
          status: 'rejected',
          reason: 'notInstalled',
        },
        { key: 'tts.engine_es', from: 'pocket', to: 'pocket', status: 'unchanged' },
      ],
      catalog: {
        service: 'tts',
        reachable: true,
        settings: [setting('tts.pocket_variant_es', 'quality')],
      },
    },
    {
      service: 'vlm',
      reachable: false,
      results: [{ key: 'vision.max_input_px', from: null, to: '512', status: 'unreachable' }],
    },
  ],
};

function intent(recordId: string, value: string): OptimisticIntent {
  return {
    id: `intent-${recordId}`,
    table: 'setting',
    kind: 'update',
    recordId,
    values: { value },
    confirmed: false,
  };
}

describe('settings profiles', () => {
  test('the wire shapes the app reads parse', () => {
    expect(settingsProfilesSchema.safeParse(listing).success).toBe(true);
    expect(profileApplyResultSchema.safeParse(applied).success).toBe(true);
    expect(
      settingsProfilesSchema.safeParse({
        ...listing,
        recommendation: {
          ...listing.recommendation,
          hardware: { ...listing.recommendation.hardware, isa: 'sse2' },
        },
      }).success
    ).toBe(false);
    expect(
      settingsProfilesSchema.safeParse({
        ...listing,
        recommendation: { ...listing.recommendation, reason: 'speed' },
      }).success
    ).toBe(false);
  });

  test('a profile intent lands on its setting row and nowhere else', () => {
    const rows = settingRows(overview);
    expect(rows).toHaveLength(2);
    const merged = applyIntents(
      rows,
      [intent(settingRecordId('tts', 'tts.pocket_variant_es'), 'fast')],
      SETTING_LENSES
    );
    expect(merged).not.toBe(rows);
    const next = withSettingRows(overview, merged);
    expect(next.owners[0]?.settings[0]?.value).toBe('fast');
    expect(next.owners[1]).toBe(overview.owners[1]);

    const same = applyIntents(
      rows,
      [intent(settingRecordId('tts', 'tts.pocket_variant_es'), 'quality')],
      SETTING_LENSES
    );
    expect(same).toBe(rows);
    expect(withSettingRows(overview, rows)).toBe(overview);
  });

  test('the returned catalogs replace only their own owners', () => {
    const next = withCatalogs(overview, returnedCatalogs(applied));
    expect(next.owners[0]).toBe(applied.owners[0]?.catalog);
    expect(next.owners[1]).toBe(overview.owners[1]);
    expect(withCatalogs(overview, [])).toBe(overview);
  });

  test('the cost counts downloads, host installs, unchanged keys and silent owners', () => {
    const cost = profileCost(quality);
    expect(cost.changes).toBe(3);
    expect(cost.unchanged).toBe(1);
    expect(cost.downloadMb).toBe(672);
    expect(cost.hostOnly.map((change) => change.key)).toEqual(['tts.pocket_voice_es']);
    expect(cost.restart).toBe(false);
    expect(cost.unreachable).toEqual(['vlm']);
  });

  test('only what can change becomes an intent, and a profile with nothing to send cannot apply', () => {
    expect(profileIntents(quality).map((item) => item.recordId)).toEqual([
      'tts:tts.pocket_variant_es',
    ]);
    expect(canApply(quality)).toBe(true);
    const settled: SettingsProfile = {
      ...quality,
      owners: [
        {
          service: 'tts',
          reachable: true,
          changes: [
            { key: 'tts.engine_es', from: 'pocket', to: 'pocket', changed: false },
            {
              key: 'tts.pocket_voice_es',
              from: 'lola',
              to: 'jean',
              changed: true,
              install: { availability: 'hostOnly', sizeMb: 30, hostCommand: 'provision' },
            },
          ],
        },
      ],
    };
    expect(canApply(settled)).toBe(false);
    expect(profileIntents(settled)).toEqual([]);
  });

  test('a refused or unreachable key is rolled back by its record id', () => {
    expect(refusedRecordIds(applied)).toEqual([
      'tts:tts.pocket_voice_es',
      'vlm:vision.max_input_px',
    ]);
  });
});
