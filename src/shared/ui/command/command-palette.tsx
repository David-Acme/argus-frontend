import { clsx } from 'clsx';
import type { ReactNode } from 'react';
import Animated, { Easing, Keyframe } from 'react-native-reanimated';
import { layout, motion, useEffects, useThemeTokens } from '@/shared/theme';

type CommandPaletteProps = { children: ReactNode };

const [x1, y1, x2, y2] = motion.easing.overshoot;

const ENTER = new Keyframe({
  0: { opacity: 0, transform: [{ scale: 0.97 }] },
  100: { opacity: 1, transform: [{ scale: 1 }], easing: Easing.bezier(x1, y1, x2, y2) },
}).duration(motion.duration.enter);

export function CommandPalette({ children }: CommandPaletteProps) {
  const { reduceMotion, reduceTransparency } = useEffects();
  const { elevation } = useThemeTokens();
  const frame = {
    width: layout.palette,
    boxShadow: `${elevation.float}, ${elevation.glassInset}`,
  };
  return (
    <Animated.View
      entering={reduceMotion ? undefined : ENTER}
      style={frame}
      className={clsx(
        'rounded-dialog max-w-full overflow-hidden',
        reduceTransparency ? 'bg-surface' : 'bg-surface/84 web:glass-palette'
      )}>
      {children}
    </Animated.View>
  );
}
