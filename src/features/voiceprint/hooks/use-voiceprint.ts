import { useCallback, useEffect, useState } from 'react';
import type { VoiceprintStatus } from '@/core/types';
import { VIEW_CACHE_KEYS } from '@/shared/constants';
import { useRemoteResource } from '@/shared/hooks/use-remote-resource';
import { useServiceAction } from '@/shared/hooks/use-service-action';
import { useTranslation } from '@/shared/hooks/use-translation';
import { voiceprintService } from '../services/voiceprint.service';
import { voiceRecorder } from '../services/voice-recorder';

const loadStatus = () => voiceprintService.status();

function forgotten(status: VoiceprintStatus): VoiceprintStatus {
  return { ...status, enrolled: false, stale: false, sampleCount: 0, enrolledAt: null, method: null };
}

export function useVoiceprint() {
  const { t } = useTranslation();
  const { data, status, reload, mutate } = useRemoteResource({
    cacheKey: VIEW_CACHE_KEYS.voiceprintStatus,
    load: loadStatus,
  });
  const { run, pending } = useServiceAction();
  const [recordable, setRecordable] = useState<boolean | null>(null);

  const apply = useCallback((next: VoiceprintStatus) => mutate(() => next), [mutate]);

  const remove = useCallback(async () => {
    let before: VoiceprintStatus | null = null;
    const result = await run({
      confirm: {
        title: t('screens.voiceprint.remove-confirm-title'),
        description: t('screens.voiceprint.remove-confirm-description'),
        confirmLabel: t('screens.voiceprint.remove'),
        intent: 'danger',
      },
      call: async () => {
        mutate((previous) => {
          before = previous;
          return previous ? forgotten(previous) : previous;
        });
        const answer = await voiceprintService.remove();
        if (!answer.ok) mutate(() => before);
        return answer;
      },
      success: t('screens.voiceprint.removed'),
      errorTitle: t('screens.voiceprint.remove-failed'),
    });
    return result !== null;
  }, [mutate, run, t]);

  useEffect(() => {
    let active = true;
    void voiceRecorder.supported().then((supported) => {
      if (active) setRecordable(supported);
    });
    return () => {
      active = false;
    };
  }, []);

  return { voiceprint: data, status, recordable, pending, reload, apply, remove };
}
