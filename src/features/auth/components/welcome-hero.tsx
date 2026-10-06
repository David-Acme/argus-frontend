import { useEffect } from 'react';
import { View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { Icon } from '@/shared/components/ui/icon';
import { useReduceMotion } from '@/shared/hooks/use-reduce-motion';
import { BrandMark } from '@/features/auth/components/brand-mark';
import {
  WELCOME_BREATH_MS,
  WELCOME_ORBIT_CHIP,
  WELCOME_ORBIT_ITEMS,
  WELCOME_ORBIT_PERIOD_MS,
} from '@/features/auth/constants/welcome';

type WelcomeHeroProps = {
  size: number;
  label: string;
};

const RINGS = [1, 0.74, 0.5] as const;

export function WelcomeHero({ size, label }: WelcomeHeroProps) {
  const reduceMotion = useReduceMotion();
  const turn = useSharedValue(0);
  const breath = useSharedValue(0);
  const radius = size / 2 - WELCOME_ORBIT_CHIP / 2;

  const orbitStyle = useAnimatedStyle(() => ({ transform: [{ rotate: `${turn.value}deg` }] }));
  const uprightStyle = useAnimatedStyle(() => ({ transform: [{ rotate: `${-turn.value}deg` }] }));
  const breathStyle = useAnimatedStyle(() => ({
    opacity: 0.55 + breath.value * 0.45,
    transform: [{ scale: 1 + breath.value * 0.035 }],
  }));

  useEffect(() => {
    if (reduceMotion) {
      turn.value = 0;
      breath.value = 1;
      return;
    }
    turn.value = 0;
    turn.value = withRepeat(withTiming(360, { duration: WELCOME_ORBIT_PERIOD_MS, easing: Easing.linear }), -1, false);
    breath.value = withRepeat(
      withTiming(1, { duration: WELCOME_BREATH_MS, easing: Easing.inOut(Easing.sin) }),
      -1,
      true
    );
  }, [breath, reduceMotion, turn]);

  return (
    <View
      accessible
      accessibilityRole="image"
      accessibilityLabel={label}
      style={{ width: size, height: size }}
      className="items-center justify-center">
      {RINGS.map((ratio, index) => (
        <Animated.View
          key={ratio}
          style={[{ width: size * ratio, height: size * ratio }, index === 1 ? breathStyle : null]}
          className={
            index === 0
              ? 'border-border absolute rounded-full border border-dashed'
              : index === 1
                ? 'border-accent/40 bg-accent-soft/40 absolute rounded-full border'
                : 'bg-accent-soft absolute rounded-full'
          }
        />
      ))}
      <BrandMark size="lg" />
      <Animated.View
        pointerEvents="none"
        style={[{ width: size, height: size }, orbitStyle]}
        className="absolute left-0 top-0">
        {WELCOME_ORBIT_ITEMS.map((item) => {
          const radians = (item.angle * Math.PI) / 180;
          return (
            <Animated.View
              key={item.icon}
              style={[
                {
                  width: WELCOME_ORBIT_CHIP,
                  height: WELCOME_ORBIT_CHIP,
                  left: size / 2 + radius * Math.cos(radians) - WELCOME_ORBIT_CHIP / 2,
                  top: size / 2 + radius * Math.sin(radians) - WELCOME_ORBIT_CHIP / 2,
                },
                uprightStyle,
              ]}
              className="bg-card absolute items-center justify-center rounded-full shadow-md shadow-black/[0.06]">
              <Icon name={item.icon} className="text-accent-strong size-5" />
            </Animated.View>
          );
        })}
      </Animated.View>
    </View>
  );
}
