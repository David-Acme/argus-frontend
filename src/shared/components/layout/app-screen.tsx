import type { ReactNode } from 'react';
import { View } from 'react-native';
import Animated from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CONTENT_MAX_WIDTH } from '@/shared/constants';
import { EdgeFade } from '@/shared/components/layout/edge-fade';
import { useBottomNavInset } from '@/shared/hooks/use-bottom-nav-inset';
import { useWindowClass } from '@/shared/hooks/use-window-class';
import { cn } from '@/shared/libs/utils';
import { useNavScrollHandler } from '@/shared/ui/nav';

type AppScreenProps = {
  children: ReactNode;
  header?: ReactNode;
  aside?: ReactNode;
  scrollable?: boolean;
  fillHeight?: boolean;
};

export function AppScreen({
  children,
  header,
  aside,
  scrollable = true,
  fillHeight = true,
}: AppScreenProps) {
  const insets = useSafeAreaInsets();
  const { windowClass, isExpanded, isShort, isWide } = useWindowClass();
  const bottomInset = useBottomNavInset();
  const onScroll = useNavScrollHandler();
  const topPad = isShort ? 8 : isExpanded ? 20 : 18;

  const body =
    aside && isWide ? (
      <View className={cn('flex-row items-stretch gap-5 lg:gap-6', fillHeight && 'flex-1')}>
        <View className="min-w-0 flex-1 gap-5">{children}</View>
        <View className="w-[300px] shrink-0 gap-5 lg:w-[340px]">{aside}</View>
      </View>
    ) : (
      <View className={scrollable ? 'flex-1 gap-5' : 'flex-1'}>
        {children}
        {aside}
      </View>
    );

  const content = (
    <View
      className="w-full flex-1 self-center px-5 lg:px-8"
      style={{
        maxWidth: CONTENT_MAX_WIDTH[windowClass],
        paddingTop: insets.top + topPad,
        paddingBottom: scrollable ? 0 : insets.bottom,
      }}>
      {header}
      {body}
    </View>
  );

  if (!scrollable) return <View className="bg-background flex-1">{content}</View>;

  return (
    <View className="bg-background flex-1">
      <Animated.ScrollView
        onScroll={onScroll}
        scrollEventThrottle={16}
        className="flex-1"
        contentContainerStyle={{ flexGrow: 1, paddingBottom: bottomInset }}
        showsVerticalScrollIndicator={false}>
        {content}
      </Animated.ScrollView>
      {insets.top > 0 ? <EdgeFade edge="top" solid={insets.top} fade={topPad} /> : null}
    </View>
  );
}
