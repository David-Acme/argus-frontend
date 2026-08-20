import { Button } from '@/shared/components/ui/button';
import { Text } from '@/shared/components/ui/text';
import { MorphIcon } from '@/shared/components/ui/morph-icon';
import { BlurReveal } from '@/shared/components/ui/blur-reveal';
import { useReduceMotion } from '@/shared/hooks/use-reduce-motion';
import { useTranslation } from '@/shared/hooks/use-translation';
import { usePairingFlow } from '@/shared/hooks/use-pairing-flow';
import { useQrScanStore } from '@/core/stores';
import {
  colorTokens,
  IS_NATIVE,
  WELCOME_CTA_DELAY_MS,
  WELCOME_CTA_DURATION_MS,
  WELCOME_ICON_DRIFT_DURATION_MS,
  WELCOME_ICON_DRIFT_PX,
  WELCOME_REDUCED_DURATION_MS,
  WELCOME_REDUCED_STEP_MS,
  WELCOME_SUBTITLE_DELAY_MS,
  WELCOME_SUBTITLE_DURATION_MS,
  WELCOME_TITLE_DELAY_MS,
  WELCOME_TITLE_DURATION_MS,
} from '@/shared/constants';
import { useRouter } from 'expo-router';
import { useCallback, useEffect } from 'react';
import { View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useUniwind } from 'uniwind';

const SUCCESS_PAUSE_MS = 700;

export default function WelcomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const reduceMotion = useReduceMotion();
  const { theme } = useUniwind();
  const flow = usePairingFlow();
  const status = useQrScanStore((s) => s.status);
  const value = useQrScanStore((s) => s.value);

  const handleStart = useCallback(() => {
    if (IS_NATIVE) {
      useQrScanStore.getState().open({ purpose: 'server' });
      router.push('/qr');
    } else {
      router.replace('/welcome/pairing');
    }
  }, [router]);

  useEffect(() => {
    if (status !== 'scanned' || value == null || flow.phase !== 'idle') return;
    void flow.run(value);
  }, [status, value, flow]);

  useEffect(() => {
    if (flow.phase !== 'success') return;
    const timer = setTimeout(
      () => router.replace(IS_NATIVE ? '/welcome/face' : '/login'),
      SUCCESS_PAUSE_MS,
    );
    return () => clearTimeout(timer);
  }, [flow.phase, router]);

  const iconDrift = useSharedValue(0);
  useEffect(() => {
    if (reduceMotion) {
      iconDrift.value = 0;
      return;
    }
    iconDrift.value = withRepeat(
      withTiming(WELCOME_ICON_DRIFT_PX, {
        duration: WELCOME_ICON_DRIFT_DURATION_MS,
        easing: Easing.inOut(Easing.cubic),
      }),
      -1,
      true,
    );
  }, [reduceMotion, iconDrift]);
  const iconStyle = useAnimatedStyle(() => ({ transform: [{ translateX: iconDrift.value }] }));

  const reducedDuration = WELCOME_REDUCED_DURATION_MS;
  const reducedGap = WELCOME_REDUCED_STEP_MS;
  const titleDelay = reduceMotion ? reducedGap / 3 : WELCOME_TITLE_DELAY_MS;
  const subtitleDelay = reduceMotion ? reducedGap : WELCOME_SUBTITLE_DELAY_MS;
  const ctaDelay = reduceMotion ? reducedGap + reducedGap / 3 : WELCOME_CTA_DELAY_MS;
  const fullDuration = (d: number) => (reduceMotion ? reducedDuration : d);

  const iconColor = colorTokens[theme === 'dark' ? 'dark' : 'light']['foreground-on-interactive'];

  return (
    <View
      className="bg-background flex-1 w-full max-w-lg self-center items-center justify-center gap-9 px-6"
      style={{ paddingTop: insets.top + 24, paddingBottom: insets.bottom + 24 }}>
      <BlurReveal delay={titleDelay} duration={fullDuration(WELCOME_TITLE_DURATION_MS)} className="items-center">
        <Text variant="h1" className="text-center">
          {t('screens.welcome.title')}
        </Text>
      </BlurReveal>

      <BlurReveal delay={subtitleDelay} duration={fullDuration(WELCOME_SUBTITLE_DURATION_MS)} className="items-center">
        <Text variant="lead" className="text-center">
          {t('screens.welcome.subtitle')}
        </Text>
      </BlurReveal>

      <BlurReveal delay={ctaDelay} duration={fullDuration(WELCOME_CTA_DURATION_MS)} blur={false} scale>
        <Button onPress={handleStart} size="lg" className="gap-3">
          <Text>{t('screens.welcome.cta')}</Text>
          <Animated.View style={iconStyle}>
            <MorphIcon name="arrow-right" size={20} color={iconColor} />
          </Animated.View>
        </Button>
      </BlurReveal>
    </View>
  );
}
