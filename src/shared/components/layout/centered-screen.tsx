import { type ReactNode } from 'react';
import { ScrollView, View } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  CENTERED_SCREEN_KEYBOARD_GAP,
  CENTERED_SCREEN_MAX_WIDTH,
  CENTERED_SCREEN_TOP_GAP,
  IS_WEB,
} from '@/shared/constants';
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
  const { isShort, isCompact } = useWindowClass();
  const pad = isShort ? 12 : 24;
  const anchorTop = isCompact && !isShort;
  const contentContainerStyle = {
    flexGrow: 1,
    justifyContent: anchorTop ? ('flex-start' as const) : ('center' as const),
    alignItems: 'center' as const,
    paddingTop: insets.top + (anchorTop ? CENTERED_SCREEN_TOP_GAP : pad),
    paddingBottom: insets.bottom + pad,
  };
  const content = (
    <View
      className={cn('w-full items-center px-6', isShort ? 'gap-5' : 'gap-9', className)}
      style={{ maxWidth }}>
      {children}
    </View>
  );

  if (IS_WEB) {
    return (
      <ScrollView
        className="bg-background flex-1"
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={contentContainerStyle}>
        {content}
      </ScrollView>
    );
  }

  return (
    <KeyboardAwareScrollView
      className="bg-background flex-1"
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      bottomOffset={CENTERED_SCREEN_KEYBOARD_GAP}
      contentContainerStyle={contentContainerStyle}>
      {content}
    </KeyboardAwareScrollView>
  );
}
