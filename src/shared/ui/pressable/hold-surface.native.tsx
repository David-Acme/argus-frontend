import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated from 'react-native-reanimated';
import { withUniwind } from 'uniwind';
import { motion, state as states, usePressScale } from '@/shared/theme';
import type { PressableSurfaceProps, SurfaceHold } from '@/shared/ui/pressable/pressable-types';

export type HoldSurfaceProps = Omit<PressableSurfaceProps, 'haptic' | 'hold'> & {
  hold: SurfaceHold;
};

const StyledView = withUniwind(Animated.View);

const ACTIONS = [{ name: 'activate' as const }];

const DISABLED = { opacity: states.disabledOpacity };

export function HoldSurface({
  a11y,
  onPress,
  pressed,
  hold,
  disabled,
  hitSlop,
  className,
  style,
  testID,
  children,
}: HoldSurfaceProps) {
  const scale = usePressScale(pressed?.scale ?? 'surface');
  const enabled = !disabled;
  const tap = () => {
    if (enabled) onPress?.();
  };
  const press = Gesture.Pan()
    .enabled(enabled)
    .runOnJS(true)
    .hitSlop(hitSlop ?? 0)
    .activateAfterLongPress(motion.hold.talk)
    .onBegin(scale.onPressIn)
    .onFinalize(scale.onPressOut)
    .onStart(hold.onStart)
    .onEnd(hold.onEnd);
  const touch = Gesture.Tap()
    .enabled(enabled)
    .runOnJS(true)
    .hitSlop(hitSlop ?? 0)
    .maxDistance(motion.hold.slop)
    .onEnd((_event, success) => {
      if (success) tap();
    });
  return (
    <GestureDetector gesture={Gesture.Exclusive(press, touch)}>
      <StyledView
        accessible
        role={a11y.role}
        aria-label={a11y.label}
        aria-selected={a11y.selected}
        aria-busy={a11y.busy}
        aria-disabled={disabled}
        accessibilityActions={ACTIONS}
        onAccessibilityAction={tap}
        testID={testID}
        className={className}
        style={[style, scale.style, disabled ? DISABLED : null]}>
        {children}
      </StyledView>
    </GestureDetector>
  );
}
