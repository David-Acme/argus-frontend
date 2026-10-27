import { clsx } from 'clsx';
import type { ReactNode } from 'react';
import { View } from 'react-native';
import { KeyboardStickyView } from 'react-native-keyboard-controller';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useKeyboardTruth } from '@/shared/hooks/use-keyboard-truth';
import { space, useWindowLayout } from '@/shared/theme';
import { keyboardOffsets } from '@/features/conversations/model/thread-list';

export type ThreadFrameProps = {
  phone: boolean;
  header: ReactNode;
  children: ReactNode;
  composer: ReactNode;
};

const COMPOSER_ABOVE_LIST = { zIndex: 1 } as const;

export function ThreadFrame({ phone, header, children, composer }: ThreadFrameProps) {
  const insets = useSafeAreaInsets();
  const capped = useWindowLayout().windowClass !== 'compact';
  const sticky = useKeyboardTruth();
  const top = { paddingTop: phone ? insets.top : 0 };
  const bottom = { paddingBottom: phone ? Math.max(insets.bottom, space[3]) : space[4] };
  return (
    <View className="bg-bg min-h-0 flex-1" style={top}>
      {header}
      <View
        className={clsx('min-h-0 w-full flex-1 px-4', capped && 'max-w-thread-max self-center')}>
        {children}
      </View>
      <KeyboardStickyView
        enabled={sticky}
        offset={keyboardOffsets(insets.bottom).sticky}
        style={COMPOSER_ABOVE_LIST}>
        <View className="bg-bg w-full">
          <View
            className={clsx('w-full gap-2 px-4 pt-2', capped && 'max-w-thread-max self-center')}
            style={bottom}>
            {composer}
          </View>
        </View>
      </KeyboardStickyView>
    </View>
  );
}
