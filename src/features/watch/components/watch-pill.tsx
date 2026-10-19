import { usePathname, useRouter } from 'expo-router';
import { useEffect } from 'react';
import { AppState, Pressable, Vibration, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icon } from '@/shared/components/ui/icon';
import { Text } from '@/shared/components/ui/text';
import { IS_NATIVE } from '@/shared/constants';
import { useTranslation } from '@/shared/hooks/use-translation';
import { cn } from '@/shared/libs/utils';
import { useVoiceCallActive } from '@/features/voice';
import { useWatch } from '@/features/watch/hooks/use-watch';
import { WATCH_INDICATORS } from '@/features/watch/model/watch-conversation';
import { onWatchWoken } from '@/features/watch/services/watch-feed';

export const WATCH_ROUTE = '/watch';

const WAKE_CUE_MS = 60;

export function WatchPill() {
  const router = useRouter();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const { live } = useWatch();
  const callActive = useVoiceCallActive();

  useEffect(
    () =>
      onWatchWoken(() => {
        if (IS_NATIVE && AppState.currentState === 'active') Vibration.vibrate(WAKE_CUE_MS);
      }),
    []
  );

  if (!live || callActive || pathname === WATCH_ROUTE || pathname.startsWith('/welcome')) return null;

  const indicator = WATCH_INDICATORS[live.state];
  const label = t('screens.watch.pill-label', {
    state: t(indicator.label),
    camera: live.cameraName || t('screens.watch.title'),
  });

  return (
    <View
      pointerEvents="box-none"
      className="absolute right-0 left-0 items-center px-4"
      style={{ top: insets.top + 8 }}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${label}. ${t('screens.watch.open-transcript')}`}
        accessibilityLiveRegion="polite"
        onPress={() => router.navigate(WATCH_ROUTE)}
        className="bg-interactive max-w-md flex-row items-center gap-2.5 rounded-full py-2.5 pr-4 pl-4 shadow-lg shadow-black/20 active:opacity-80">
        <View className={cn('size-2 rounded-full', indicator.dot)} />
        <Icon name={indicator.icon} className="text-foreground-on-interactive size-4" />
        <Text className="text-foreground-on-interactive text-caption shrink font-semibold" numberOfLines={1}>
          {label}
        </Text>
      </Pressable>
    </View>
  );
}
