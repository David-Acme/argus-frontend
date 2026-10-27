import { RefreshControl } from 'react-native';
import Animated from 'react-native-reanimated';
import type { ScreenScrollProps } from './screen-scroll-types';

const HUG = { flexGrow: 0 } as const;

export function ScreenScroll({
  onScroll,
  refresh,
  contentStyle,
  hug = false,
  children,
}: ScreenScrollProps) {
  return (
    <Animated.ScrollView
      onScroll={onScroll}
      scrollEventThrottle={16}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      className={hug ? undefined : 'flex-1'}
      style={hug ? HUG : undefined}
      contentContainerStyle={contentStyle}
      refreshControl={
        refresh ? (
          <RefreshControl refreshing={refresh.refreshing} onRefresh={refresh.onRefresh} />
        ) : undefined
      }>
      {children}
    </Animated.ScrollView>
  );
}
