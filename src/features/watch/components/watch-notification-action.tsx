import { useRouter, type Href } from 'expo-router';
import { Button } from '@/shared/ui/button';
import { useTranslation } from '@/shared/hooks/use-translation';
import { useVoiceCallActive } from '@/features/voice';
import { useContinueHere } from '@/features/watch/hooks/use-continue-here';
import { useWatch } from '@/features/watch/hooks/use-watch';
import { canContinueHere } from '@/features/watch/model/watch-conversation';
import { visitorMessageOf, watchNotificationAction } from '@/features/watch/model/watch-notification';
import { VisitorReply } from '@/features/watch/components/visitor-reply';
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
  const visitor = visitorMessageOf(kind, data);

  if (visitor) return <VisitorReply message={visitor} onReplied={onDone} />;
  if (!action) return null;

  if (action.kind === 'open') {
    return (
      <Button
        compact
        label={t('screens.watch.notification.open-action')}
        onPress={() => {
          onDone?.();
          router.push(action.href as Href);
        }}
      />
    );
  }

  const target = action.kind === 'continue' && live?.conversationId === action.conversationId ? live : null;
  const offerContinue = supported && target !== null && canContinueHere(target, now, callActive);

  return (
    <>
      {offerContinue && target ? (
        <Button
          compact
          variant="primary"
          label={t('screens.watch.notification.continue-action')}
          onPress={() => {
            onDone?.();
            continueHere({ conversationId: target.conversationId, cameraName: target.cameraName });
          }}
        />
      ) : null}
      <Button
        compact
        label={t('screens.watch.notification.transcript-action')}
        onPress={() => {
          onDone?.();
          router.push(WATCH_ROUTE);
        }}
      />
    </>
  );
}
