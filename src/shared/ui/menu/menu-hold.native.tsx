import type { ReactNode } from 'react';
import { View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { feedback } from '@/shared/theme';
import type { MenuPoint } from './menu-types';

export type MenuHoldProps = { onOpen: (point: MenuPoint) => void; children: ReactNode };

export function MenuHold({ onOpen, children }: MenuHoldProps) {
  const gesture = Gesture.LongPress()
    .runOnJS(true)
    .onStart((event) => {
      feedback('impactLight');
      onOpen({ x: event.absoluteX, y: event.absoluteY });
    });
  return (
    <GestureDetector gesture={gesture}>
      <View collapsable={false}>{children}</View>
    </GestureDetector>
  );
}
