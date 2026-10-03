import { type ReactNode } from 'react';
import { ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CENTERED_SCREEN_MAX_WIDTH } from '@/shared/constants';
import { useWindowClass } from '@/shared/hooks/use-window-class';
import { cn } from '@/shared/libs/utils';

type CenteredScreenProps = {
  children: ReactNode;
  maxWidth?: number;
  className?: string;
};

export function CenteredScreen({
  children,
  maxWidth = CENTERED_SCREEN_MAX_WIDTH,
  className,
}: CenteredScreenProps) {
  const insets = useSafeAreaInsets();
  const { isShort } = useWindowClass();
  const pad = isShort ? 12 : 24;

  return (
    <ScrollView
      className="bg-background flex-1"
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={{
        flexGrow: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingTop: insets.top + pad,
        paddingBottom: insets.bottom + pad,
      }}>
      <View
        className={cn('w-full items-center px-6', isShort ? 'gap-5' : 'gap-9', className)}
        style={{ maxWidth }}>
        {children}
      </View>
    </ScrollView>
  );
}
