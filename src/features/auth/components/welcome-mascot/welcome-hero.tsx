import { useEffect } from 'react';
import { Pressable, View } from 'react-native';
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Ellipse, RadialGradient, Stop } from 'react-native-svg';
import { useUniwind } from 'uniwind';
import { Text } from '@/shared/components/ui/text';
import { useReduceMotion } from '@/shared/hooks/use-reduce-motion';
import { useTranslation } from '@/shared/hooks/use-translation';
import {
  MASCOT_BOX,
  MASCOT_ORBIT,
  MASCOT_STAGE,
  MASCOT_UNITS,
  WELCOME_MODULES,
} from '@/features/auth/constants/welcome-mascot';
import { useFrameBudget } from '@/features/auth/hooks/use-frame-budget';
import { useWelcomeChoreography } from '@/features/auth/hooks/use-welcome-choreography';
import { gazeDirection, orbitAngle } from '@/features/auth/model/mascot-orbit';
import { MascotFigure } from './mascot-figure';
import { OrbitChip } from './orbit-chip';
import { OrbitTrack } from './orbit-track';

type WelcomeHeroProps = {
  scale: number;
  label: string;
};

const GROUND = { left: 135, top: 272, width: 120, height: 22 } as const;

export function WelcomeHero({ scale, label }: WelcomeHeroProps) {
  const { t } = useTranslation();
  const reduceMotion = useReduceMotion();
  const strained = useFrameBudget(!__DEV__ && !reduceMotion);
  const still = reduceMotion || strained;
  const { theme } = useUniwind();
  const count = WELCOME_MODULES.length;
  const { pose, replay, run } = useWelcomeChoreography(count, still);
  const spin = useSharedValue(0);
  const look = useSharedValue(pose.look);
  const attend = useSharedValue(0);
  const bubble = useSharedValue(0);
  const direction = useDerivedValue(() => gazeDirection(orbitAngle(look.value, count, spin.value)));
  const unit = (MASCOT_BOX.size * scale) / MASCOT_UNITS;
  const centerX = MASCOT_STAGE.centerX * scale;
  const centerY = MASCOT_STAGE.centerY * scale;

  const groundStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: direction.value.x * 7 * scale * attend.value }],
  }));
  const bubbleStyle = useAnimatedStyle(() => ({
    opacity: Math.min(1, bubble.value * 1.4),
    transform: [{ scale: 0.3 + bubble.value * 0.7 }],
  }));

  useEffect(() => {
    if (!pose.orbiting || still) {
      cancelAnimation(spin);
      spin.value = 0;
      return;
    }
    spin.value = withRepeat(
      withTiming(spin.value + 360, { duration: MASCOT_ORBIT.periodMs, easing: Easing.linear }),
      -1,
      false
    );
  }, [pose.orbiting, spin, still]);

  useEffect(() => {
    look.value = pose.look;
    attend.value = withTiming(pose.attending ? 1 : 0, {
      duration: 900,
      easing: Easing.bezier(0.45, -0.2, 0.25, 1.2),
    });
  }, [attend, look, pose.attending, pose.look]);

  useEffect(() => {
    bubble.value = withTiming(pose.bubble ? 1 : 0, {
      duration: pose.bubble ? 450 : 250,
      easing: pose.bubble ? Easing.bezier(0.3, 1.6, 0.5, 1) : Easing.out(Easing.quad),
    });
  }, [bubble, pose.bubble]);

  return (
    <View style={{ width: MASCOT_STAGE.width * scale, height: MASCOT_STAGE.height * scale }}>
      <Animated.View
        aria-hidden
        pointerEvents="none"
        renderToHardwareTextureAndroid
        style={[
          {
            position: 'absolute',
            left: GROUND.left * scale,
            top: GROUND.top * scale,
            width: GROUND.width * scale,
            height: GROUND.height * scale,
          },
          groundStyle,
        ]}>
        <Svg width={GROUND.width * scale} height={GROUND.height * scale} viewBox="0 0 120 22">
          <RadialGradient id="argus-mascot-ground" cx={0.5} cy={0.5} r={0.5}>
            <Stop
              offset={0}
              stopColor={theme === 'dark' ? '#000000' : '#281E0F'}
              stopOpacity={theme === 'dark' ? 0.6 : 0.28}
            />
            <Stop offset={1} stopColor="#000000" stopOpacity={0} />
          </RadialGradient>
          <Ellipse cx={60} cy={11} rx={60} ry={11} fill="url(#argus-mascot-ground)" />
        </Svg>
      </Animated.View>
      <OrbitTrack
        scale={scale}
        half="back"
        shown={pose.orbiting || still}
        dark={theme === 'dark'}
      />
      {WELCOME_MODULES.map((module, index) => (
        <OrbitChip
          key={module.id}
          module={module}
          index={index}
          count={count}
          revealed={index < pose.revealed}
          inspected={pose.lens === 'lift' && pose.look % count === index}
          still={still}
          spin={spin}
          scale={scale}
          centerX={centerX}
          centerY={centerY}
        />
      ))}
      <Pressable
        accessible
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityHint={t('screens.welcome.hero-replay-hint')}
        onPress={replay}
        style={{
          position: 'absolute',
          left: MASCOT_BOX.left * scale,
          top: MASCOT_BOX.top * scale,
          width: MASCOT_BOX.size * scale,
          height: MASCOT_BOX.size * scale,
          zIndex: 2,
        }}>
        <MascotFigure
          key={run}
          unit={unit}
          pose={pose}
          still={still}
          dark={theme === 'dark'}
          direction={direction}
          attend={attend}
        />
      </Pressable>
      <OrbitTrack
        scale={scale}
        half="front"
        shown={pose.orbiting || still}
        dark={theme === 'dark'}
      />
      <Animated.View
        aria-hidden
        pointerEvents="none"
        className="bg-card border-border-subtle absolute rounded-2xl border px-4 py-2"
        style={[
          { left: 40 * scale, top: 54 * scale, zIndex: 4, transformOrigin: ['100%', '100%', 0] },
          bubbleStyle,
        ]}>
        <Text variant="subhead">{t('screens.welcome.hello')}</Text>
      </Animated.View>
    </View>
  );
}
