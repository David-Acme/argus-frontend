import { useCallback } from 'react';
import { notificationService } from '@/core/services/notification.service';
import { useAuthStore } from '@/core/stores';
import { useCapabilities } from '@/shared/hooks/use-capabilities';
import { useTranslation } from '@/shared/hooks/use-translation';
import { runOptimistic } from '@/shared/libs/optimistic-action';
import { threadDeleteIntents, threadTargetOf } from '@/features/home/model/notification-optimistic';
import type { NotificationThread } from '@/features/home/model/notification-threads';

export function useNewsRemove(): ((thread: NotificationThread) => void) | null {
  const { t } = useTranslation();
  const { can } = useCapabilities();
  const userId = String(useAuthStore((state) => state.user?.id ?? ''));
  const remove = useCallback(
    (thread: NotificationThread) =>
      void runOptimistic({
        intents: threadDeleteIntents(thread),
        call: () => notificationService.removeThread(threadTargetOf(thread, userId)),
        undo: { title: t('screens.home.notification-deleted'), description: thread.latest.title },
        errorTitle: t('screens.home.notification-delete-failed'),
      }),
    [t, userId]
  );
  return can('notification', 'delete') ? remove : null;
}
