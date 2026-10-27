import { Pressable } from 'react-native-gesture-handler';
import Animated from 'react-native-reanimated';
import { withUniwind } from 'uniwind';
import { IS_ANDROID } from '@/shared/constants';
import { useThemeTokens } from '@/shared/theme';
import type { PressableSurfaceProps } from '@/shared/ui/pressable/pressable-types';
import { HoldSurface } from '@/shared/ui/pressable/hold-surface.native';
import { useSurfacePress } from '@/shared/ui/pressable/use-surface-press';

type TapSurfaceProps = Omit<PressableSurfaceProps, 'hold'>;

const StyledPressable = withUniwind(Pressable);

export function PressableSurface({ hold, ...props }: PressableSurfaceProps) {
  if (hold) return <HoldSurface {...props} hold={hold} />;
  return <TapSurface {...props} />;
}

function TapSurface({
  a11y,
  onPress,
  haptic,
  pressed,
  disabled,
  hitSlop,
  className,
  style,
  testID,
  children,
}: TapSurfaceProps) {
  const { color } = useThemeTokens();
  const press = useSurfacePress({
    onPress,
    haptic,
    pressed: IS_ANDROID ? { scale: pressed?.scale } : pressed,
    disabled,
    style,
  });
  return (
    <Animated.View className={pressed?.grow ? 'grow' : undefined} style={press.scaleStyle}>
      <StyledPressable
        accessible
        accessibilityRole={a11y.role}
        accessibilityLabel={a11y.label}
        accessibilityState={{
          checked: a11y.checked,
          selected: a11y.selected,
          expanded: a11y.expanded,
          busy: a11y.busy,
          disabled,
        }}
        disabled={disabled}
        hitSlop={hitSlop}
        onPress={press.onPress}
        onPressIn={press.onPressIn}
        onPressOut={press.onPressOut}
        testID={testID}
        android_ripple={IS_ANDROID ? { color: color['fill-press'], foreground: true } : undefined}
        className={className}
        style={press.surfaceStyle}>
        {children}
      </StyledPressable>
    </Animated.View>
  );
}
