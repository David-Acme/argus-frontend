import { useCallback } from 'react';
import type { WatchConversation } from '@/core/types';
import { useServiceAction } from '@/shared/hooks/use-service-action';
import { useTranslation } from '@/shared/hooks/use-translation';
import { applyWatchFrame } from '@/features/watch/services/watch-feed';
import { watchService } from '@/features/watch/services/watch.service';

export function useWatchActions() {
  const { t } = useTranslation();
  const { run, pending } = useServiceAction();

  const end = useCallback(
    async (conversation: WatchConversation) => {
      const result = await run({
        confirm: {
          title: t('screens.watch.end-confirm-title'),
          description: t('screens.watch.end-confirm-description', {
            camera: conversation.cameraName || t('screens.watch.title'),
          }),
          confirmLabel: t('screens.watch.end-action'),
          intent: 'warning',
        },
        call: () => watchService.end(conversation.conversationId),
        errorTitle: t('screens.watch.end-failed'),
      });
      if (result === null) return;
      const now = Date.now();
      applyWatchFrame({ ...conversation, state: 'ended', endReason: 'ended_by_user', updatedAt: now }, now);
    },
    [run, t]
  );

  return { end, pending };
}
