import { usePathname, useRouter } from 'expo-router';
import { View } from 'react-native';
import { ScopedTheme } from 'uniwind';
import { useTranslation } from '@/shared/hooks/use-translation';
import { PressableSurface } from '@/shared/ui/pressable';
import { Text } from '@/shared/ui/text';
import { CallAvatar } from '@/features/voice/components/call-avatar';
import { RoundControl } from '@/features/voice/components/round-control';
import { CALL_BANNER_CONTROL, CALL_MINI_AVATAR } from '@/features/voice/constants/call.constant';
import { useCallBridge } from '@/features/voice/hooks/use-call-bridge';
import { useCallClock } from '@/features/voice/hooks/use-call-clock';
import { useCallFloat } from '@/features/voice/hooks/use-call-float';
import { useVoiceSession } from '@/features/voice/hooks/use-voice-session';
import { formatCallClock, stagePresenceOf } from '@/features/voice/model/call-stage';
import { holdTalkLive } from '@/features/voice/model/hold-talk';
import { CALL_SCREEN_PATH } from '@/features/voice/model/incoming-surface';
import { useHoldTalkStore } from '@/features/voice/stores/hold-talk.store';

export function CallPill() {
  useCallBridge();
  const router = useRouter();
  const pathname = usePathname();
  const float = useCallFloat();
  const { t } = useTranslation();
  const { isActive, phase, connectedAt, stop } = useVoiceSession();
  const elapsedMs = useCallClock(isActive ? connectedAt : null);
  const holding = useHoldTalkStore((state) => holdTalkLive(state.hold));

  if (!isActive || holding || pathname === CALL_SCREEN_PATH || pathname.startsWith('/welcome'))
    return null;

  const status =
    phase === 'reconnecting'
      ? t('screens.voice.status-reconnecting')
      : t('screens.voice.stage.mini-line', { time: formatCallClock(elapsedMs) });

  return (
    <ScopedTheme theme="dark">
      <View
        className="bg-surface rounded-media absolute inset-x-3 flex-row items-center gap-3 self-center py-2 pr-2 pl-3"
        style={float}>
        <PressableSurface
          a11y={{ label: t('screens.voice.back-to-call'), role: 'button' }}
          onPress={() => router.navigate(CALL_SCREEN_PATH)}
          pressed={{ grow: true }}
          className="min-w-0 flex-1 flex-row items-center gap-3">
          <CallAvatar
            state={stagePresenceOf({ moment: 'live', phase, kind: 'reminder' })}
            size={CALL_MINI_AVATAR}
          />
          <View className="min-w-0 flex-1">
            <Text variant="label">{t('screens.voice.argus')}</Text>
            <Text variant="rowMeta" tone="2" numberOfLines={1}>
              {status}
            </Text>
          </View>
        </PressableSurface>
        <RoundControl
          icon="hang"
          tone="decline"
          label={t('screens.voice.end-call')}
          size={CALL_BANNER_CONTROL}
          onPress={stop}
        />
      </View>
    </ScopedTheme>
  );
}
