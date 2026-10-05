import { useCallback } from 'react';
import type { HouseholdPrivacy, HouseholdPrivacyPatch, PrivacyDirectory, PrivacySignal } from '@/core/types';
import { privacyService } from '@/features/privacy/services/privacy.service';
import { VIEW_CACHE_KEYS } from '@/shared/constants';
import { useRemoteResource } from '@/shared/hooks/use-remote-resource';
import { useTranslation } from '@/shared/hooks/use-translation';
import { confirm } from '@/shared/libs/confirm';
import { toastServiceError } from '@/shared/libs/service-error';

type UsePrivacyDirectoryOptions = {
  enabled?: boolean;
};

export type HouseholdSwitch = PrivacySignal | 'visitorRecognition';

const load = () => privacyService.directory();

const OFF_CONFIRMATION = {
  presence: ['screens.privacy.household.off-presence-title', 'screens.privacy.household.off-presence-description'],
  faceCameras: ['screens.privacy.household.off-face-title', 'screens.privacy.household.off-face-description'],
  voiceLearning: ['screens.privacy.household.off-voice-title', 'screens.privacy.household.off-voice-description'],
  cameraAudio: ['screens.privacy.household.off-audio-title', 'screens.privacy.household.off-audio-description'],
  visitorRecognition: [
    'screens.privacy.household.visitors-off-title',
    'screens.privacy.household.visitors-off-description',
  ],
} as const satisfies Record<HouseholdSwitch, readonly [string, string]>;

function patched(directory: PrivacyDirectory | null, patch: HouseholdPrivacyPatch): PrivacyDirectory | null {
  if (!directory) return directory;
  const household: HouseholdPrivacy = {
    presence: patch.presence ?? directory.household.presence,
    faceCameras: patch.faceCameras ?? directory.household.faceCameras,
    voiceLearning: patch.voiceLearning ?? directory.household.voiceLearning,
    cameraAudio: patch.cameraAudio ?? directory.household.cameraAudio,
    visitorRecognition: patch.visitorRecognition ?? directory.household.visitorRecognition,
  };
  return { ...directory, household };
}

export function usePrivacyDirectory({ enabled = true }: UsePrivacyDirectoryOptions = {}) {
  const { t } = useTranslation();
  const { data, status, mutate, reload } = useRemoteResource<PrivacyDirectory>({
    cacheKey: VIEW_CACHE_KEYS.privacyDirectory,
    load,
    enabled,
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
        key === 'visitorRecognition' && value ? { [key]: value, acknowledge: acknowledged } : { [key]: value }
      );
    },
    [save, t]
  );

  return { directory: data, status, setSwitch, reload };
}
