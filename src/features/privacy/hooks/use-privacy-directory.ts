import { useCallback } from 'react';
import type {
  HouseholdPrivacy,
  HouseholdPrivacyPatch,
  MinorMark,
  PrivacyDirectory,
  PrivacySignal,
  ResourceMatch,
} from '@/core/types';
import { minorChangeOf, minorMarkOf, normalizedMark, withMinorMark, type MinorChange } from '@/features/privacy/model/minor';
import { privacyService } from '@/features/privacy/services/privacy.service';
import { VIEW_CACHE_KEYS } from '@/shared/constants';
import { useRemoteResource } from '@/shared/hooks/use-remote-resource';
import { useTranslation } from '@/shared/hooks/use-translation';
import { confirm } from '@/shared/libs/confirm';
import { toastServiceError } from '@/shared/libs/service-error';

type UsePrivacyDirectoryOptions = {
  enabled?: boolean;
};

export type MinorUpdate = {
  userId: number;
  name: string;
  mark: MinorMark;
};

export type HouseholdSwitch = PrivacySignal | 'location' | 'visitorRecognition' | 'watchman';

const ACKNOWLEDGED_SWITCHES: readonly HouseholdSwitch[] = ['visitorRecognition', 'watchman'];

const load = () => privacyService.directory();

const OFF_CONFIRMATION = {
  presence: ['screens.privacy.household.off-presence-title', 'screens.privacy.household.off-presence-description'],
  faceCameras: ['screens.privacy.household.off-face-title', 'screens.privacy.household.off-face-description'],
  voiceLearning: ['screens.privacy.household.off-voice-title', 'screens.privacy.household.off-voice-description'],
  cameraAudio: ['screens.privacy.household.off-audio-title', 'screens.privacy.household.off-audio-description'],
  location: ['screens.privacy.household.off-location-title', 'screens.privacy.household.off-location-description'],
  watchman: ['screens.privacy.household.watchman-off-title', 'screens.privacy.household.watchman-off-description'],
  visitorRecognition: [
    'screens.privacy.household.visitors-off-title',
    'screens.privacy.household.visitors-off-description',
  ],
} as const satisfies Record<HouseholdSwitch, readonly [string, string]>;

const MINOR_CONFIRMATION = {
  mark: ['screens.privacy.minor.mark-title', 'screens.privacy.minor.mark-description', 'screens.privacy.minor.mark-confirm'],
  unmark: ['screens.privacy.minor.unmark-title', 'screens.privacy.minor.unmark-description', 'screens.privacy.minor.unmark-confirm'],
  consent: [
    'screens.privacy.minor.consent-title',
    'screens.privacy.minor.consent-description',
    'screens.privacy.minor.consent-confirm',
  ],
  withdraw: [
    'screens.privacy.minor.withdraw-title',
    'screens.privacy.minor.withdraw-description',
    'screens.privacy.minor.withdraw-confirm',
  ],
} as const satisfies Record<MinorChange, readonly [string, string, string]>;

function patched(directory: PrivacyDirectory | null, patch: HouseholdPrivacyPatch): PrivacyDirectory | null {
  if (!directory) return directory;
  const household: HouseholdPrivacy = {
    presence: patch.presence ?? directory.household.presence,
    faceCameras: patch.faceCameras ?? directory.household.faceCameras,
    voiceLearning: patch.voiceLearning ?? directory.household.voiceLearning,
    cameraAudio: patch.cameraAudio ?? directory.household.cameraAudio,
    location: patch.location ?? directory.household.location,
    visitorRecognition: patch.visitorRecognition ?? directory.household.visitorRecognition,
    watchman: patch.watchman ?? directory.household.watchman,
  };
  return { ...directory, household };
}

const PRIVACY_HOUSEHOLD: readonly ResourceMatch[] = [{ domain: 'identity', scope: 'privacy_household' }];

export function usePrivacyDirectory({ enabled = true }: UsePrivacyDirectoryOptions = {}) {
  const { t } = useTranslation();
  const { data, status, mutate, reload } = useRemoteResource<PrivacyDirectory>({
    cacheKey: VIEW_CACHE_KEYS.privacyDirectory,
    load,
    enabled,
    resources: PRIVACY_HOUSEHOLD,
  });

  const save = useCallback(
    async (patch: HouseholdPrivacyPatch): Promise<boolean> => {
      let before: PrivacyDirectory | null = null;
      mutate((previous) => {
        before = previous;
        return patched(previous, patch);
      });
      const result = await privacyService.updateHousehold(patch);
      if (!result.ok || !result.info) {
        mutate(() => before);
        toastServiceError(result.errors, t('screens.privacy.household.save-failed'));
        return false;
      }
      const saved = result.info;
      mutate(() => saved);
      return true;
    },
    [mutate, t]
  );

  const setSwitch = useCallback(
    async (key: HouseholdSwitch, value: boolean, acknowledged = false): Promise<boolean> => {
      if (!value) {
        const [title, description] = OFF_CONFIRMATION[key];
        const accepted = await confirm({
          title: t(title),
          description: t(description),
          confirmLabel: t('screens.privacy.household.off-confirm'),
          intent: 'danger',
        });
        if (!accepted) return false;
      }
      return save(
        ACKNOWLEDGED_SWITCHES.includes(key) && value ? { [key]: value, acknowledge: acknowledged } : { [key]: value }
      );
    },
    [save, t]
  );

  const setMinor = useCallback(
    async ({ userId, name, mark }: MinorUpdate): Promise<boolean> => {
      const current = data?.users.find((user) => user.userId === userId);
      if (!current) return false;
      const next = normalizedMark(mark);
      const change = minorChangeOf(minorMarkOf(current), next);
      if (change === null) return true;
      const [title, description, confirmLabel] = MINOR_CONFIRMATION[change];
      const accepted = await confirm({
        title: t(title, { name }),
        description: t(description, { name }),
        confirmLabel: t(confirmLabel),
        intent: 'warning',
      });
      if (!accepted) return false;
      let before: PrivacyDirectory | null = null;
      mutate((previous) => {
        before = previous;
        return withMinorMark(previous, userId, next);
      });
      const result = await privacyService.markMinor(userId, next);
      if (!result.ok || !result.info) {
        mutate(() => before);
        toastServiceError(result.errors, t('screens.privacy.minor.save-failed'));
        return false;
      }
      const saved = result.info;
      mutate(() => saved);
      return true;
    },
    [data, mutate, t]
  );

  return { directory: data, status, setSwitch, setMinor, reload };
}
