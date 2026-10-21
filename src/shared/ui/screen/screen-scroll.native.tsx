import { RefreshControl } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { size } from '@/shared/theme';
import type { ScreenScrollProps } from './screen-scroll-types';

const KEYBOARD_GAP = size.target / 2;

export function ScreenScroll({ onScroll, refresh, contentStyle, children }: ScreenScrollProps) {
  return (
    <KeyboardAwareScrollView
      onScroll={onScroll}
      bottomOffset={KEYBOARD_GAP}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="interactive"
      className="flex-1"
      contentContainerStyle={contentStyle}
      refreshControl={
        refresh ? (
          <RefreshControl refreshing={refresh.refreshing} onRefresh={refresh.onRefresh} />
        ) : undefined
      }>
      {children}
    </KeyboardAwareScrollView>
  );
}
