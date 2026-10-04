import { usePathname, useRouter } from 'expo-router';
import { Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icon } from '@/shared/components/ui/icon';
import { Text } from '@/shared/components/ui/text';
import { useCallBridge } from '@/features/voice/hooks/use-call-bridge';
import { useTranslation } from '@/shared/hooks/use-translation';
import { useVoiceSession } from '@/features/voice/hooks/use-voice-session';

export function CallPill() {
  useCallBridge();
  const router = useRouter();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const { isActive, phase, callReason, stop } = useVoiceSession();
  const label =
    callReason ??
    t(phase === 'reconnecting' ? 'screens.voice.status-reconnecting' : 'screens.voice.in-call');

  if (!isActive || pathname === '/call' || pathname.startsWith('/welcome')) return null;

  return (
    <View
      pointerEvents="box-none"
      className="absolute right-0 left-0 items-center px-4"
      style={{ top: insets.top + 8 }}>
      <View className="bg-interactive max-w-md flex-row items-center rounded-full shadow-lg shadow-black/20">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('screens.voice.back-to-call')}
          onPress={() => router.navigate('/call')}
          className="shrink flex-row items-center gap-2.5 py-2.5 pr-2 pl-4 active:opacity-80">
          <View
            className={
              phase === 'reconnecting'
                ? 'bg-warning size-2 rounded-full'
                : 'bg-success size-2 rounded-full'
            }
          />
          <Icon name="phone" className="text-foreground-on-interactive size-4" />
          <Text
            className="text-foreground-on-interactive text-caption shrink font-semibold"
            numberOfLines={1}>
            {label}
          </Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('screens.voice.end-call')}
          onPress={stop}
          hitSlop={6}
          className="bg-error mr-1.5 size-8 items-center justify-center rounded-full active:opacity-75">
          <Icon name="phone-off" className="text-foreground-on-error size-4" />
        </Pressable>
      </View>
    </View>
  );
}
