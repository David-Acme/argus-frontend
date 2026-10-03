import { Button } from '@/shared/components/ui/button';
import { Icon } from '@/shared/components/ui/icon';
import { CenteredScreen } from '@/shared/components/layout';
import { Text } from '@/shared/components/ui/text';
import { MorphIcon } from '@/shared/components/ui/morph-icon';
import { BlurReveal } from '@/shared/components/ui/blur-reveal';
import { useReduceMotion } from '@/shared/hooks/use-reduce-motion';
import { useTranslation } from '@/shared/hooks/use-translation';
import { colorTokens, IS_NATIVE } from '@/shared/constants';
import { WELCOME_CTA_DELAY_MS, WELCOME_CTA_DURATION_MS, WELCOME_ICON_DRIFT_DURATION_MS, WELCOME_ICON_DRIFT_PX, WELCOME_REDUCED_DURATION_MS, WELCOME_REDUCED_STEP_MS, WELCOME_SUBTITLE_DELAY_MS, WELCOME_SUBTITLE_DURATION_MS, WELCOME_TITLE_DELAY_MS, WELCOME_TITLE_DURATION_MS } from '@/features/auth/constants/welcome';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LanguageSwitch } from '@/features/auth/components/language-switch';
import { useCallback, useEffect } from 'react';
import { View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { useUniwind } from 'uniwind';

export default function WelcomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const reduceMotion = useReduceMotion();
  const { theme } = useUniwind();
  const handleStart = useCallback(() => router.push('/welcome/pairing'), [router]);
  const handleInvitation = useCallback(() => router.push('/welcome/invitation'), [router]);

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
    <View className="bg-background flex-1">
    <CenteredScreen>
      <BlurReveal delay={titleDelay} duration={fullDuration(WELCOME_TITLE_DURATION_MS)} className="items-center">
        <Text variant="display" className="text-center">
          {t('screens.welcome.title')}
        </Text>
      </BlurReveal>

      <BlurReveal delay={subtitleDelay} duration={fullDuration(WELCOME_SUBTITLE_DURATION_MS)} className="items-center">
        <Text variant="subhead" className="text-center">
          {t('screens.welcome.subtitle')}
        </Text>
      </BlurReveal>

      <BlurReveal delay={ctaDelay} duration={fullDuration(WELCOME_CTA_DURATION_MS)} blur={false} scale>
        <View className="items-center gap-3">
          <Button onPress={handleStart} size="lg" className="gap-3">
            <Text>{t('screens.welcome.cta')}</Text>
            <Animated.View style={iconStyle}>
              <MorphIcon name="arrow-right" size={20} color={iconColor} />
            </Animated.View>
          </Button>
          <Text variant="caption" className="max-w-xs text-center">
            {t('screens.welcome.requirement')}
          </Text>
          {IS_NATIVE ? (
            <Button variant="ghost" onPress={handleInvitation}>
              <Icon name="scan-barcode" />
              <Text>{t('screens.welcome.join-invitation')}</Text>
            </Button>
          ) : null}
        </View>
      </BlurReveal>
    </CenteredScreen>
      <View className="absolute right-0 top-0" style={{ paddingTop: insets.top + 12, paddingRight: 16 }}>
        <LanguageSwitch />
      </View>
    </View>
  );
}
