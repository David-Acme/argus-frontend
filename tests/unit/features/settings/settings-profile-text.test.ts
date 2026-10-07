import { describe, expect, mock, test } from 'bun:test';
import type { ProfileRecommendation } from '@/core/types';

mock.module('@/core/i18n', () => ({
  t: (key: string, params?: Record<string, string>) =>
    params ? `${key}|${Object.values(params).join(',')}` : key,
  tk: (key: string) => key,
}));

const { profileFit, recommendationReason, settingValueLabel } =
  await import('@/features/settings/model/profile-text');

const rules = [
  { profile: 'quality', minCores: 8, minRamGb: 14, vectorIsa: true },
  { profile: 'balanced', minCores: 4, minRamGb: 7, vectorIsa: true },
];

const quality: ProfileRecommendation = {
  profile: 'quality',
  reason: 'meets',
  hardware: { cores: 8, threads: 16, ramGb: 30.7, isa: 'avx2', gpu: 'vaapi' },
  rule: rules[0] ?? null,
  missed: null,
  rules,
  fallback: 'performance',
};

const balanced: ProfileRecommendation = {
  ...quality,
  profile: 'balanced',
  reason: 'cores',
  hardware: { cores: 6, threads: 12, ramGb: 15.4, isa: 'avx2', gpu: 'none' },
  rule: rules[1] ?? null,
  missed: rules[0] ?? null,
};

describe('profile text', () => {
  test('the recommended card carries the reason, built from the hardware facts', () => {
    expect(profileFit('quality', quality)).toEqual({
      recommended: true,
      title: 'screens.settings.profiles.recommended',
      detail: 'screens.settings.profiles.reason.meets|8,31',
    });
    expect(recommendationReason(balanced)).toBe(
      'screens.settings.profiles.reason.cores|6,quality,8'
    );
  });

  test('the other cards say what they ask for and how this machine compares', () => {
    expect(profileFit('balanced', quality)).toEqual({
      recommended: false,
      title: 'screens.settings.profiles.fit.needs|4,7',
      detail: 'screens.settings.profiles.fit.below',
    });
    expect(profileFit('performance', quality).title).toBe('screens.settings.profiles.fit.any');
    expect(profileFit('quality', balanced)).toEqual({
      recommended: false,
      title: 'screens.settings.profiles.fit.needs|8,14',
      detail: 'screens.settings.profiles.fit.above',
    });
    expect(profileFit('performance', balanced).detail).toBe('screens.settings.profiles.fit.below');
  });

  test('values read as the app names them', () => {
    expect(settingValueLabel('vision.max_input_px', '256')).toBe(
      'screens.settings.profiles.preview.px|256'
    );
    expect(settingValueLabel('vision.max_input_px', null)).toBe(
      'screens.settings.profiles.preview.unknown'
    );
    expect(settingValueLabel('tts.pocket_variant_es', 'fast')).toBe('fast');
  });
});
