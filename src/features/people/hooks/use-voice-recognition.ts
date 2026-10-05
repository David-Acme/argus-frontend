import { useCallback, useMemo } from 'react';
import type { RecognizedVoice, VoiceprintDirectory } from '@/core/types';
import { VIEW_CACHE_KEYS } from '@/shared/constants';
import { useRemoteResource } from '@/shared/hooks/use-remote-resource';
import { useServiceAction } from '@/shared/hooks/use-service-action';
import { useTranslation } from '@/shared/hooks/use-translation';
import { withoutVoice } from '@/features/people/model/biometric-erase';
import { voiceprintService } from '@/features/people/services/voiceprint.service';

export type ForgetVoiceInput = {
  userId: number;
  name: string;
};

const NOTHING_LEARNED = 404;

const loadDirectory = () => voiceprintService.directory();

export function useVoiceRecognition(userId: number) {
  const { t } = useTranslation();
  const { data, mutate } = useRemoteResource({
    cacheKey: VIEW_CACHE_KEYS.voiceprintUsers,
    load: loadDirectory,
  });
  const { run, pending } = useServiceAction();

  const voice = useMemo<RecognizedVoice | null>(
    () => data?.recognized.find((entry) => entry.userId === userId) ?? null,
    [data, userId]
  );

  const forget = useCallback(
    async ({ userId: subject, name }: ForgetVoiceInput) => {
      let before: VoiceprintDirectory | null = null;
      const result = await run({
        confirm: {
          title: t('screens.users.voice.forget-title', { name }),
          description: t('screens.users.voice.forget-description'),
          confirmLabel: t('screens.users.voice.forget'),
          intent: 'danger',
        },
        call: async () => {
          mutate((previous) => {
            before = previous;
            return withoutVoice(previous, subject);
          });
          const answer = await voiceprintService.forget(subject);
          if (answer.ok || answer.status === NOTHING_LEARNED) return { ...answer, ok: true };
          mutate(() => before);
          return answer;
        },
        success: t('screens.users.voice.forgotten', { name }),
        errorTitle: t('screens.users.voice.forget-error'),
      });
      return result !== null;
    },
    [mutate, run, t]
  );

  return { voice, pending, forget };
}
