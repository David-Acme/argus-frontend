import { useRouter, usePathname } from 'expo-router';
import { useEffect } from 'react';
import { Vibration, View } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button } from '@/shared/components/ui/button';
import { Text } from '@/shared/components/ui/text';
import { useTranslation } from '@/shared/hooks/use-translation';
import { useVoiceSession } from '@/features/voice/hooks/use-voice-session';
import { incomingSurfaceVisible, isCriticalRing } from '@/features/voice/model/incoming-surface';
import { voiceService } from '@/features/voice/services/voice';

const ALERT_PATTERN = [0, 400, 200, 400];

export function IncomingCallSurface() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const pathname = usePathname();
  const router = useRouter();
  const { waitingCall } = useVoiceSession();
  const visible = incomingSurfaceVisible(waitingCall, pathname);
  const critical = isCriticalRing(waitingCall?.urgency);

  useEffect(() => {
    if (!visible || !critical) return;
    Vibration.vibrate(ALERT_PATTERN, true);
    return () => Vibration.cancel();
  }, [visible, critical]);

  if (!visible || !waitingCall) return null;

  const answer = () => {
    voiceService.answerWaiting();
    router.navigate('/call');
  };
  const decline = () => {
    void voiceService.declineCall(waitingCall.callId);
  };

  return (
    <Animated.View
      entering={FadeIn.duration(180)}
      exiting={FadeOut.duration(150)}
      accessibilityRole="alert"
      accessibilityLiveRegion="assertive"
      className="bg-background absolute inset-0 items-center justify-center px-6"
      style={{ paddingTop: insets.top, paddingBottom: insets.bottom }}>
      <View className="bg-card w-full max-w-md gap-4 rounded-3xl p-6 shadow-lg shadow-black/15">
        <Text variant="label" className={critical ? 'text-error-strong' : 'text-foreground-secondary'}>
          {critical ? t('screens.voice.ring-critical') : t('screens.voice.incoming-title')}
        </Text>
        <Text variant="title" numberOfLines={3}>
          {waitingCall.reason}
        </Text>
        <View className="flex-row gap-3">
          <Button variant="outline" className="min-h-12 flex-1" onPress={decline}>
            <Text>{t('screens.voice.ring-decline')}</Text>
          </Button>
          <Button className="min-h-12 flex-1" onPress={answer}>
            <Text>{t('screens.voice.ring-answer')}</Text>
          </Button>
        </View>
      </View>
    </Animated.View>
  );
}
