import { usePathname, useRouter } from 'expo-router';
import { Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icon } from '@/shared/components/ui/icon';
import { Text } from '@/shared/components/ui/text';
import { useCallBridge } from '@/shared/hooks/use-call-bridge';
import { useTranslation } from '@/shared/hooks/use-translation';
import { useVoiceSession } from '@/shared/hooks/use-voice-session';

export function CallPill() {
  useCallBridge();
  const router = useRouter();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const { isActive } = useVoiceSession();

  if (!isActive || pathname === '/call' || pathname.startsWith('/welcome')) return null;

  return (
    <View pointerEvents="box-none" className="absolute right-0 left-0 items-center" style={{ top: insets.top + 8 }}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('screens.voice.back-to-call')}
        onPress={() => router.navigate('/call')}
        className="bg-interactive flex-row items-center gap-2.5 rounded-full px-4 py-2.5 shadow-lg shadow-black/20 active:opacity-80">
        <View className="bg-success size-2 rounded-full" />
        <Icon name="phone" className="text-foreground-on-interactive size-4" />
        <Text className="text-foreground-on-interactive text-caption font-semibold">
          {t('screens.voice.in-call')}
        </Text>
      </Pressable>
    </View>
  );
}
