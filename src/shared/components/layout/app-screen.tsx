import type { ReactNode } from 'react';
import { ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CONTENT_MAX_WIDTH } from '@/shared/constants';
import { useBottomNav } from '@/shared/components/layout/use-bottom-nav';
import { useBottomNavInset } from '@/shared/hooks/use-bottom-nav-inset';
import { useWindowClass } from '@/shared/hooks/use-window-class';
import { cn } from '@/shared/libs/utils';

type AppScreenProps = {
  children: ReactNode;
  header?: ReactNode;
  aside?: ReactNode;
  scrollable?: boolean;
  bottomNav?: boolean;
  fillHeight?: boolean;
};

export function AppScreen({
  children,
  header,
  aside,
  scrollable = true,
  bottomNav = true,
  fillHeight = true,
}: AppScreenProps) {
  const insets = useSafeAreaInsets();
  const { windowClass, isExpanded, isShort, isWide } = useWindowClass();
  const bottomInset = useBottomNavInset();

  useBottomNav(bottomNav);

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
        paddingTop: insets.top + (isShort ? 8 : isExpanded ? 20 : 18),
        paddingBottom: scrollable ? 0 : insets.bottom,
      }}>
      {header}
      {body}
    </View>
  );

  if (!scrollable) return <View className="bg-background flex-1">{content}</View>;

  return (
    <ScrollView
      className="bg-background flex-1"
      contentContainerClassName="grow"
      contentContainerStyle={{ paddingBottom: bottomNav ? bottomInset : 24 }}
      showsVerticalScrollIndicator={false}>
      {content}
    </ScrollView>
  );
}
