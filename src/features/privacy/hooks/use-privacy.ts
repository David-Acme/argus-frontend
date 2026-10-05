import { useCallback } from 'react';
import type { PrivacyChoices, PrivacyMe, PrivacySignal } from '@/core/types';
import { privacyService } from '@/features/privacy/services/privacy.service';
import { decisionOf, effectiveOf, withChoice } from '@/features/privacy/model/privacy';
import { PRIVACY_NOTICE_VERSION } from '@/features/privacy/constants/privacy';
import { VIEW_CACHE_KEYS } from '@/shared/constants';
import { useRemoteResource } from '@/shared/hooks/use-remote-resource';
import { useTranslation } from '@/shared/hooks/use-translation';
import { confirm } from '@/shared/libs/confirm';
import { toastServiceError } from '@/shared/libs/service-error';

type UsePrivacyOptions = {
  enabled?: boolean;
};

const load = () => privacyService.me();

const WITHDRAW_CONFIRMATION = {
  voiceLearning: {
    title: 'screens.privacy.withdraw-voice-title',
    description: 'screens.privacy.withdraw-voice-description',
  },
  presence: {
    title: 'screens.privacy.withdraw-presence-title',
    description: 'screens.privacy.withdraw-presence-description',
  },
} as const;

export function usePrivacy({ enabled = true }: UsePrivacyOptions = {}) {
  const { t } = useTranslation();
  const { data, status, mutate, reload } = useRemoteResource<PrivacyMe>({
    cacheKey: VIEW_CACHE_KEYS.privacyMe,
    load,
    enabled,
  });

  const decide = useCallback(
    async (choices: PrivacyChoices): Promise<boolean> => {
      mutate((previous) =>
        previous
          ? {
              ...previous,
              decided: true,
              current: true,
              noticeVersion: PRIVACY_NOTICE_VERSION,
              choices,
              effective: effectiveOf(choices, previous.household),
            }
          : previous
      );
      const result = await privacyService.decide(decisionOf(choices));
      if (!result.ok || !result.info) {
        toastServiceError(result.errors, t('screens.privacy.consent.save-failed'));
        void reload();
        return false;
      }
      const saved = result.info;
      mutate(() => saved);
      return true;
    },
    [mutate, reload, t]
  );

  const setChoice = useCallback(
    async (signal: PrivacySignal, value: boolean) => {
      if (!data) return;
      if (!value && data.choices[signal] && (signal === 'voiceLearning' || signal === 'presence')) {
        const copy = WITHDRAW_CONFIRMATION[signal];
        const accepted = await confirm({
          title: t(copy.title),
          description: t(copy.description),
          confirmLabel: t('screens.privacy.withdraw-confirm'),
          intent: 'danger',
        });
        if (!accepted) return;
      }
      await decide(withChoice(data, signal, value).choices);
    },
    [data, decide, t]
  );

  return { me: data, status, decide, setChoice, reload };
}
