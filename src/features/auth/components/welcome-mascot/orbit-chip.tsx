import { useEffect, useState } from 'react';
import { View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedReaction,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import { Icon } from '@/shared/components/ui/icon';
import { Text } from '@/shared/components/ui/text';
import { useTranslation } from '@/shared/hooks/use-translation';
import { cn } from '@/shared/libs/utils';
import { MASCOT_ORBIT, type WelcomeModule } from '@/features/auth/constants/welcome-mascot';
import { orbitAngle, orbitPoint, orbitScale } from '@/features/auth/model/mascot-orbit';

type OrbitChipProps = {
  module: WelcomeModule;
  index: number;
  count: number;
  revealed: boolean;
  inspected: boolean;
  still: boolean;
  spin: SharedValue<number>;
  scale: number;
  centerX: number;
  centerY: number;
};

const REVEAL_EASING = Easing.bezier(0.3, 1.25, 0.5, 1);

export function OrbitChip({
  module,
  index,
  count,
  revealed,
  inspected,
  still,
  spin,
  scale,
  centerX,
  centerY,
}: OrbitChipProps) {
  const { t } = useTranslation();
  const chip = MASCOT_ORBIT.chip * scale;
  const reveal = useSharedValue(still && revealed ? 1 : 0);
  const focus = useSharedValue(0);
  const halo = useSharedValue(1);
  const labelWidth = 150 * scale;
  const [front, setFront] = useState(false);

  const placeStyle = useAnimatedStyle(() => {
    const point = orbitPoint(orbitAngle(index, count, spin.value));
    const r = reveal.value;
    return {
      opacity: Math.min(1, r * 1.6),
      transform: [
        { translateX: centerX + point.x * scale * r - chip / 2 },
        { translateY: centerY + point.y * scale * r - chip / 2 },
        { scale: orbitScale(point.depth) * (0.2 + 0.8 * r) },
      ],
    };
  });
  const tileStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: -6 * scale * focus.value }, { scale: 1 + 0.12 * focus.value }],
  }));
  const haloStyle = useAnimatedStyle(() => ({
    opacity: (1 - halo.value) * 0.9,
    transform: [{ scale: 0.8 + halo.value * 0.6 }],
  }));
  const labelStyle = useAnimatedStyle(() => ({
    opacity: still ? 1 : focus.value,
    transform: [{ translateY: (1 - focus.value) * -6 * scale }],
  }));

  useAnimatedReaction(
    () => orbitPoint(orbitAngle(index, count, spin.value)).depth >= 0,
    (inFront, previous) => {
      if (inFront !== previous) scheduleOnRN(setFront, inFront);
    }
  );

  useEffect(() => {
    reveal.value = withTiming(revealed ? 1 : 0, {
      duration: still ? 0 : 900,
      easing: REVEAL_EASING,
    });
  }, [reveal, revealed, still]);

  useEffect(() => {
    focus.value = withTiming(inspected ? 1 : 0, {
      duration: 450,
      easing: Easing.bezier(0.3, 1.5, 0.5, 1),
    });
    if (!inspected || still) return;
    halo.value = 0;
    halo.value = withTiming(1, { duration: 1100, easing: Easing.out(Easing.quad) });
  }, [focus, halo, inspected, still]);

  return (
    <Animated.View
      aria-hidden
      pointerEvents="none"
      style={[
        { position: 'absolute', left: 0, top: 0, width: chip, height: chip, zIndex: front ? 3 : 1 },
        placeStyle,
      ]}>
      <Animated.View
        className="border-legacy-accent absolute rounded-3xl border-2"
        style={[
          {
            left: -6 * scale,
            top: -6 * scale,
            width: chip + 12 * scale,
            height: chip + 12 * scale,
          },
          haloStyle,
        ]}
      />
      <Animated.View
        renderToHardwareTextureAndroid
        className={cn(
          'items-center justify-center rounded-3xl',
          module.soon
            ? 'border-border border-2 border-dashed'
            : 'bg-card border-border-subtle border'
        )}
        style={[{ width: chip, height: chip }, tileStyle]}>
        <Icon
          name={module.icon}
          className={cn('size-6', module.soon ? 'text-muted-foreground' : 'text-accent-strong')}
        />
      </Animated.View>
      <Animated.View
        className="absolute items-center gap-1"
        style={[
          { top: chip + 6 * scale, left: (chip - labelWidth) / 2, width: labelWidth },
          labelStyle,
        ]}>
        <Text variant="label" className="text-foreground-secondary text-center" numberOfLines={1}>
          {t(module.label)}
        </Text>
        {module.soon ? (
          <View className="bg-accent-soft rounded-full px-2 py-0.5">
            <Text variant="micro" className="text-accent-strong">
              {t('screens.welcome.modules.soon')}
            </Text>
          </View>
        ) : null}
      </Animated.View>
    </Animated.View>
  );
}
