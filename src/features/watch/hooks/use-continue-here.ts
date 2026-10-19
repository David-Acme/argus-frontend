import { useRouter } from 'expo-router';
import { useCallback } from 'react';
import { continueWatchConversation, watchContinuationSupported } from '@/features/voice';
import { useTranslation } from '@/shared/hooks/use-translation';
import { toast } from '@/shared/libs/toast';

export type ContinueHereInput = {
  conversationId: string;
  cameraName: string;
};

export const CALL_ROUTE = '/call';

export function useContinueHere() {
  const router = useRouter();
  const { t } = useTranslation();
  const supported = watchContinuationSupported();

  const continueHere = useCallback(
    ({ conversationId, cameraName }: ContinueHereInput) => {
      if (!supported) {
        toast.error(t('screens.watch.continue-unsupported'));
        return;
      }
      const reason = cameraName ? t('screens.watch.title-camera', { camera: cameraName }) : t('screens.watch.title');
      if (!continueWatchConversation({ conversationId, reason })) {
        toast.error(t('screens.watch.continue-failed'));
        return;
      }
      router.navigate(CALL_ROUTE);
    },
    [router, supported, t]
  );

  return { continueHere, supported };
}
