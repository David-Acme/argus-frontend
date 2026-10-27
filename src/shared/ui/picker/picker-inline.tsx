import { useState, type ReactNode } from 'react';
import Animated, { FadeIn, FadeOut, LinearTransition } from 'react-native-reanimated';
import { motion } from '@/shared/theme';
import { PressableSurface } from '@/shared/ui/pressable';
import { PICKER_ROW, PickerRowContent } from './picker-row';

export type PickerShellProps = {
  label: string;
  value: string;
  empty: boolean;
  testID?: string;
  children: (close: () => void, side: boolean) => ReactNode;
};

const ENTER = FadeIn.duration(motion.duration.base);

const EXIT = FadeOut.duration(motion.duration.fast);

export function PickerInline({ label, value, empty, testID, children }: PickerShellProps) {
  const [open, setOpen] = useState(false);
  return (
    <Animated.View layout={LinearTransition} className="overflow-hidden">
      <PressableSurface
        a11y={{ label: `${label}, ${value}`, role: 'button', expanded: open }}
        onPress={() => setOpen(!open)}
        testID={testID}
        className={PICKER_ROW}>
        <PickerRowContent label={label} value={value} open={open} empty={empty} />
      </PressableSurface>
      {open ? (
        <Animated.View entering={ENTER} exiting={EXIT} className="pb-2">
          {children(() => setOpen(false), false)}
        </Animated.View>
      ) : null}
    </Animated.View>
  );
}
