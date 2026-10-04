import { t, tk } from '@/core/i18n';
import type { HardwareFacts, ProfileRecommendation } from '@/core/types';

const PIXEL_SUFFIX = '_px';

export function profileName(labelKey: string): string {
  const key = `screens.settings.profiles.items.${labelKey}.name`;
  const name = tk(key);
  return name === key ? labelKey : name;
}

export function profileSummary(labelKey: string): string {
  const key = `screens.settings.profiles.items.${labelKey}.summary`;
  const summary = tk(key);
  return summary === key ? '' : summary;
}

export function settingLabel(key: string): string {
  const labelKey = `screens.settings.keys.${key}.label`;
  const label = tk(labelKey);
  return label === labelKey ? key : label;
}

export function settingValueLabel(key: string, value: string | null): string {
  if (value === null) return t('screens.settings.profiles.preview.unknown');
  if (key.endsWith(PIXEL_SUFFIX)) return t('screens.settings.profiles.preview.px', { value });
  const choiceKey = `screens.settings.choices.${value}`;
  const choice = tk(choiceKey);
  return choice === choiceKey ? value : choice;
}

export function ramGigabytes(ramGb: number): string {
  return String(Math.round(ramGb));
}

export function recommendationReason(recommendation: ProfileRecommendation): string {
  const { hardware, missed, reason } = recommendation;
  const cores = String(hardware.cores);
  const ram = ramGigabytes(hardware.ramGb);
  switch (reason) {
    case 'meets':
      return t('screens.settings.profiles.reason.meets', { cores, ram });
    case 'cores':
      return t('screens.settings.profiles.reason.cores', {
        cores,
        profile: profileName(missed?.profile ?? ''),
        min: String(missed?.minCores ?? 0),
      });
    case 'ram':
      return t('screens.settings.profiles.reason.ram', {
        ram,
        profile: profileName(missed?.profile ?? ''),
        min: String(missed?.minRamGb ?? 0),
      });
    case 'isa':
      return t('screens.settings.profiles.reason.isa');
  }
}

export function hardwareFacts(hardware: HardwareFacts): string[] {
  return [
    t('screens.settings.profiles.hardware.cores', { count: String(hardware.cores) }),
    t('screens.settings.profiles.hardware.threads', { count: String(hardware.threads) }),
    t('screens.settings.profiles.hardware.ram', { count: ramGigabytes(hardware.ramGb) }),
    t(`screens.settings.profiles.hardware.isa.${hardware.isa}`),
    t(`screens.settings.profiles.hardware.gpu.${hardware.gpu}`),
  ];
}

export type ProfileFit = {
  recommended: boolean;
  title: string;
  detail: string;
};

function demandOf(profileId: string, recommendation: ProfileRecommendation): number {
  const index = recommendation.rules.findIndex((rule) => rule.profile === profileId);
  if (index >= 0) return index;
  return profileId === recommendation.fallback
    ? recommendation.rules.length
    : recommendation.rules.length + 1;
}

export function profileFit(profileId: string, recommendation: ProfileRecommendation): ProfileFit {
  if (profileId === recommendation.profile)
    return {
      recommended: true,
      title: t('screens.settings.profiles.recommended'),
      detail: recommendationReason(recommendation),
    };
  const rule = recommendation.rules.find((candidate) => candidate.profile === profileId);
  const demanding =
    demandOf(profileId, recommendation) < demandOf(recommendation.profile, recommendation);
  return {
    recommended: false,
    title: rule
      ? t('screens.settings.profiles.fit.needs', {
          cores: String(rule.minCores),
          ram: String(rule.minRamGb),
        })
      : t('screens.settings.profiles.fit.any'),
    detail: demanding
      ? t('screens.settings.profiles.fit.above')
      : t('screens.settings.profiles.fit.below'),
  };
}
