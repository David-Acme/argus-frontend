import { useRouter, usePathname } from 'expo-router';
import { useEffect, useState } from 'react';
import { Vibration, View } from 'react-native';
import Animated, {
  cancelAnimation,
  FadeIn,
  FadeOut,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Avatar from '@/features/voice/components/avatar';
import { CallControl } from '@/features/voice/components/call-control';
import { Text } from '@/shared/components/ui/text';
import { useReduceMotion } from '@/shared/hooks/use-reduce-motion';
import { useTranslation } from '@/shared/hooks/use-translation';
import { useVoiceSession } from '@/features/voice/hooks/use-voice-session';
import { formatCallDuration } from '@/features/voice/model/call-end';
import { incomingSurfaceVisible, isCriticalRing } from '@/features/voice/model/incoming-surface';
import { voiceService } from '@/features/voice/services/voice';

const ALERT_PATTERN = [0, 400, 200, 400];
const PULSE_MS = 900;
const ELAPSED_TICK_MS = 1000;

function PulsingEmblem({ label }: { label: string }) {
  const reduceMotion = useReduceMotion();
  const scale = useSharedValue(1);

  useEffect(() => {
    if (reduceMotion) return;
    scale.value = withRepeat(withTiming(1.06, { duration: PULSE_MS }), -1, true);
    return () => cancelAnimation(scale);
  }, [reduceMotion, scale]);

  const style = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <Animated.View style={style}>
      <Avatar size={160} accessibilityLabel={label} />
    </Animated.View>
  );
}

export function IncomingCallSurface() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const pathname = usePathname();
  const router = useRouter();
  const { waitingCall } = useVoiceSession();
  const visible = incomingSurfaceVisible(waitingCall, pathname);
  const critical = isCriticalRing(waitingCall?.urgency);
  const callId = waitingCall?.callId ?? null;
  const [clock, setClock] = useState<{ callId: string | null; started: number; now: number }>({
    callId: null,
    started: 0,
    now: 0,
  });
  const elapsedMs = clock.callId === callId ? clock.now - clock.started : 0;

  useEffect(() => {
    if (!visible || !critical) return;
    Vibration.vibrate(ALERT_PATTERN, true);
    return () => Vibration.cancel();
  }, [visible, critical]);

  useEffect(() => {
    if (callId === null) return;
    const started = Date.now();
    const timer = setInterval(() => setClock({ callId, started, now: Date.now() }), ELAPSED_TICK_MS);
    return () => clearInterval(timer);
  }, [callId]);

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
      <View className="w-full max-w-md items-center gap-6">
        <Text variant="label" className={critical ? 'text-error-strong' : 'text-foreground-secondary'}>
          {critical ? t('screens.voice.ring-critical') : t('screens.voice.incoming-title')}
        </Text>
        <PulsingEmblem label={t('screens.voice.call-title')} />
        <View className="items-center gap-2">
          <Text variant="title" numberOfLines={3} className="text-center">
            {waitingCall.reason}
          </Text>
          <Text variant="caption" className="text-foreground-secondary text-center">
            {t('screens.voice.ring-status', { time: formatCallDuration(elapsedMs) })}
          </Text>
        </View>
        <View className="flex-row justify-center gap-10 pt-2">
          <CallControl icon="phone-off" label={t('screens.voice.ring-decline')} tone="danger" onPress={decline} />
          <CallControl icon="phone" label={t('screens.voice.ring-answer')} tone="success" onPress={answer} />
        </View>
      </View>
    </Animated.View>
  );
}
