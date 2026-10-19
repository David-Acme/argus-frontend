import { useRouter, type Href } from 'expo-router';
import { View } from 'react-native';
import { Button } from '@/shared/components/ui/button';
import { Text } from '@/shared/components/ui/text';
import { useTranslation } from '@/shared/hooks/use-translation';
import { useVoiceCallActive } from '@/features/voice';
import { useContinueHere } from '@/features/watch/hooks/use-continue-here';
import { useWatch } from '@/features/watch/hooks/use-watch';
import { canContinueHere } from '@/features/watch/model/watch-conversation';
import { watchNotificationAction } from '@/features/watch/model/watch-notification';
import { WATCH_ROUTE } from '@/features/watch/components/watch-pill';

type WatchNotificationActionProps = {
  kind: string | null;
  data: Readonly<Record<string, unknown>>;
  onDone?: () => void;
};

export function WatchNotificationAction({ kind, data, onDone }: WatchNotificationActionProps) {
  const router = useRouter();
  const { t } = useTranslation();
  const { live, now } = useWatch();
  const callActive = useVoiceCallActive();
  const { continueHere, supported } = useContinueHere();
  const action = watchNotificationAction(kind, data);

  if (!action) return null;

  if (action.kind === 'open') {
    return (
      <View className="flex-row pt-1.5">
        <Button
          size="sm"
          variant="outline"
          onPress={() => {
            onDone?.();
            router.push(action.href as Href);
          }}>
          <Text>{t('screens.watch.notification.open-action')}</Text>
        </Button>
      </View>
    );
  }

  const target = action.kind === 'continue' && live?.conversationId === action.conversationId ? live : null;
  const offerContinue = supported && target !== null && canContinueHere(target, now, callActive);

  return (
    <View className="flex-row gap-2 pt-1.5">
      {offerContinue && target ? (
        <Button
          size="sm"
          onPress={() => {
            onDone?.();
            continueHere({ conversationId: target.conversationId, cameraName: target.cameraName });
          }}>
          <Text>{t('screens.watch.notification.continue-action')}</Text>
        </Button>
      ) : null}
      <Button
        size="sm"
        variant="outline"
        onPress={() => {
          onDone?.();
          router.push(WATCH_ROUTE);
        }}>
        <Text>{t('screens.watch.notification.transcript-action')}</Text>
      </Button>
    </View>
  );
}
