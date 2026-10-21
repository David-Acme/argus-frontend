import { RefreshControl } from 'react-native';
import Animated from 'react-native-reanimated';
import type { ScreenScrollProps } from './screen-scroll-types';

export function ScreenScroll({ onScroll, refresh, contentStyle, children }: ScreenScrollProps) {
  return (
    <Animated.ScrollView
      onScroll={onScroll}
      scrollEventThrottle={16}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      className="flex-1"
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
