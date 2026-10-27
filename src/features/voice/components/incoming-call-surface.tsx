import { usePathname, useRouter } from 'expo-router';
import { useEffect } from 'react';
import { Vibration, View } from 'react-native';
import Animated, { FadeIn, FadeOut, SlideInUp, SlideOutUp } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ScopedTheme } from 'uniwind';
import type { IncomingCall } from '@/core/types';
import { useTranslation } from '@/shared/hooks/use-translation';
import { elevation, space } from '@/shared/theme';
import { Text } from '@/shared/ui/text';
import { CallAvatar } from '@/features/voice/components/call-avatar';
import { CallStage } from '@/features/voice/components/call-stage';
import { RING_CHOICE_LOOKS, RingControls } from '@/features/voice/components/ring-controls';
import { RoundControl } from '@/features/voice/components/round-control';
import {
  CALL_BANNER_AVATAR,
  CALL_BANNER_CONTROL,
  CALL_RING_VIBRATION,
  CALL_STAGE_MAX_WIDTH,
} from '@/features/voice/constants/call.constant';
import { useReminderCall } from '@/features/voice/hooks/use-reminder-call';
import { useVoiceSession } from '@/features/voice/hooks/use-voice-session';
import {
  callKindOf,
  callReminderIdOf,
  callSubjectOf,
  ringChoices,
  ringSurfaceOf,
} from '@/features/voice/model/incoming-surface';
import type { RingChoice } from '@/features/voice/model/incoming-surface';
import { voiceService } from '@/features/voice/services/voice';

type RingProps = {
  call: IncomingCall;
  choices: readonly RingChoice[];
  busy: boolean;
  onChoose: (choice: RingChoice) => void;
};

function RingBanner({ call, choices, busy, onChoose }: RingProps) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const place = {
    top: insets.top + space[2],
    maxWidth: CALL_STAGE_MAX_WIDTH,
    boxShadow: elevation.dark.float,
  };
  return (
    <ScopedTheme theme="dark">
      <Animated.View
        entering={SlideInUp.springify()}
        exiting={SlideOutUp}
        role="alertdialog"
        aria-label={t('screens.voice.incoming-title')}
        accessibilityLiveRegion="assertive"
        className="bg-surface rounded-dialog absolute inset-x-2 flex-row items-center gap-3 self-center p-3"
        style={place}>
        <CallAvatar state="listen" size={CALL_BANNER_AVATAR} />
        <View className="min-w-0 flex-1">
          <Text variant="headline">{t('screens.voice.argus')}</Text>
          <Text variant="meta" tone="2" numberOfLines={1}>
            {t('screens.voice.ring.banner-line', { subject: callSubjectOf(call) })}
          </Text>
        </View>
        {choices.map((choice) => (
          <RoundControl
            key={choice}
            icon={RING_CHOICE_LOOKS[choice].icon}
            tone={RING_CHOICE_LOOKS[choice].tone}
            label={t(RING_CHOICE_LOOKS[choice].label)}
            size={CALL_BANNER_CONTROL}
            disabled={busy && choice === 'snooze'}
            onPress={() => onChoose(choice)}
          />
        ))}
      </Animated.View>
    </ScopedTheme>
  );
}

function RingStage({ call, choices, onChoose }: RingProps) {
  const { t } = useTranslation();
  return (
    <Animated.View
      entering={FadeIn.duration(180)}
      exiting={FadeOut.duration(150)}
      role="alertdialog"
      aria-label={t('screens.voice.ring.alert-kicker')}
      accessibilityLiveRegion="assertive"
      className="absolute inset-0">
      <CallStage
        kind="alert"
        line={t('screens.voice.ring.alert-line', { subject: callSubjectOf(call) })}
        presence="alert">
        {call.summary.trim() ? (
          <View className="mt-4 px-4">
            <Text variant="meta" tone="2" align="center" numberOfLines={3}>
              {call.summary.trim()}
            </Text>
          </View>
        ) : null}
        <View className="flex-1" />
        <RingControls choices={choices} onChoose={onChoose} />
      </CallStage>
    </Animated.View>
  );
}

export function IncomingCallSurface() {
  const pathname = usePathname();
  const router = useRouter();
  const { waitingCall } = useVoiceSession();
  const reminderCall = useReminderCall();
  const surface = ringSurfaceOf({ waiting: waitingCall, pathname });

  useEffect(() => {
    if (surface !== 'full') return;
    Vibration.vibrate(CALL_RING_VIBRATION, true);
    return () => Vibration.cancel();
  }, [surface]);

  if (surface === 'none' || !waitingCall) return null;

  const reminderId = callReminderIdOf(waitingCall);
  const choices = ringChoices({
    kind: callKindOf(waitingCall.urgency),
    snoozable: reminderId !== null,
  });
  const choose = (choice: RingChoice) => {
    if (choice === 'decline') void voiceService.declineCall(waitingCall.callId);
    if (choice === 'snooze' && reminderId !== null)
      void reminderCall.snooze({ callId: waitingCall.callId, reminderId });
    if (choice !== 'answer') return;
    voiceService.answerWaiting();
    router.navigate('/call');
  };
  const ring = { call: waitingCall, choices, busy: reminderCall.pending, onChoose: choose };

  return surface === 'banner' ? <RingBanner {...ring} /> : <RingStage {...ring} />;
}
