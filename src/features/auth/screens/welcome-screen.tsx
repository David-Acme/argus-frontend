import { useRouter } from 'expo-router';
import { useCallback, useEffect } from 'react';
import { ScrollView, View, useWindowDimensions } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useUniwind } from 'uniwind';
import { BlurReveal } from '@/shared/components/ui/blur-reveal';
import { Button } from '@/shared/components/ui/button';
import { Icon } from '@/shared/components/ui/icon';
import { OrbitHero } from '@/shared/components/ui/orbit-hero';
import { MorphIcon } from '@/shared/components/ui/morph-icon';
import { Text } from '@/shared/components/ui/text';
import { colorTokens, IS_NATIVE } from '@/shared/constants';
import { useReduceMotion } from '@/shared/hooks/use-reduce-motion';
import { useTranslation } from '@/shared/hooks/use-translation';
import { useWindowClass } from '@/shared/hooks/use-window-class';
import { cn } from '@/shared/libs/utils';
import { LanguageSwitch } from '@/features/auth/components/language-switch';
import {
  WELCOME_BREATH_MS,
  WELCOME_CTA_DELAY_MS,
  WELCOME_CTA_DURATION_MS,
  WELCOME_HERO_MAX,
  WELCOME_HERO_MIN,
  WELCOME_ICON_DRIFT_DURATION_MS,
  WELCOME_ICON_DRIFT_PX,
  WELCOME_ORBIT_CHIP,
  WELCOME_ORBIT_ITEMS,
  WELCOME_ORBIT_PERIOD_MS,
  WELCOME_REDUCED_DURATION_MS,
  WELCOME_REDUCED_STEP_MS,
  WELCOME_SUBTITLE_DELAY_MS,
  WELCOME_SUBTITLE_DURATION_MS,
  WELCOME_TITLE_DELAY_MS,
  WELCOME_TITLE_DURATION_MS,
} from '@/features/auth/constants/welcome';
import { hrefOf, ONBOARDING_FLOWS } from '@/features/auth/model/onboarding-flow';

export default function WelcomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const { t } = useTranslation();
  const reduceMotion = useReduceMotion();
  const { theme } = useUniwind();
  const { isExpanded, isShort, isLandscape } = useWindowClass();
  const side = isExpanded || (isLandscape && !isShort && width >= 900);
  const heroSize = Math.round(
    Math.max(
      WELCOME_HERO_MIN,
      Math.min(WELCOME_HERO_MAX, side ? height * 0.46 : Math.min(width - 96, height * (isShort ? 0.34 : 0.38)))
    )
  );
  const iconDrift = useSharedValue(0);
  const iconStyle = useAnimatedStyle(() => ({ transform: [{ translateX: iconDrift.value }] }));
  const delay = (full: number, reduced: number) => (reduceMotion ? reduced : full);
  const duration = (full: number) => (reduceMotion ? WELCOME_REDUCED_DURATION_MS : full);
  const iconColor = colorTokens[theme === 'dark' ? 'dark' : 'light']['foreground-on-interactive'];
  const [ownerStart] = ONBOARDING_FLOWS.owner;
  const [invitedStart] = ONBOARDING_FLOWS.invited;

  const handleStart = useCallback(() => {
    if (ownerStart) router.push(hrefOf('owner', ownerStart));
  }, [ownerStart, router]);
  const handleInvitation = useCallback(() => {
    if (invitedStart) router.push(hrefOf('invited', invitedStart));
  }, [invitedStart, router]);

  useEffect(() => {
    if (reduceMotion) {
      iconDrift.value = 0;
      return;
    }
    iconDrift.value = withRepeat(
      withTiming(WELCOME_ICON_DRIFT_PX, { duration: WELCOME_ICON_DRIFT_DURATION_MS, easing: Easing.inOut(Easing.cubic) }),
      -1,
      true
    );
  }, [reduceMotion, iconDrift]);

  return (
    <View className="bg-background flex-1">
      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          flexGrow: 1,
          justifyContent: 'center',
          paddingTop: insets.top + (isShort ? 56 : 72),
          paddingBottom: insets.bottom + 24,
          paddingHorizontal: 24,
        }}>
        <View
          className={cn(
            'w-full self-center',
            side ? 'max-w-5xl flex-row items-center justify-center gap-16' : 'max-w-lg items-center',
            isShort ? 'gap-6' : 'gap-10'
          )}>
          <BlurReveal delay={delay(0, 0)} duration={duration(900)} blur={false} scale>
            <OrbitHero
              size={heroSize}
              label={t('screens.welcome.hero-label')}
              items={WELCOME_ORBIT_ITEMS}
              orbitMs={WELCOME_ORBIT_PERIOD_MS}
              breathMs={WELCOME_BREATH_MS}
              chipSize={WELCOME_ORBIT_CHIP}
            />
          </BlurReveal>

          <View className={cn('gap-6', side ? 'max-w-md flex-1 items-start' : 'w-full items-center')}>
            <BlurReveal
              delay={delay(WELCOME_TITLE_DELAY_MS, WELCOME_REDUCED_STEP_MS / 3)}
              duration={duration(WELCOME_TITLE_DURATION_MS)}
              className={side ? 'items-start' : 'items-center'}>
              <View className={cn('gap-3', side ? 'items-start' : 'items-center')}>
                <Text variant="display" className={side ? 'text-left' : 'text-center'}>
                  {t('screens.welcome.title')}
                </Text>
                <Text
                  variant="subhead"
                  className={cn('text-foreground-secondary max-w-md', side ? 'text-left' : 'text-center')}>
                  {t('screens.welcome.subtitle')}
                </Text>
              </View>
            </BlurReveal>

            <BlurReveal
              delay={delay(WELCOME_SUBTITLE_DELAY_MS, WELCOME_REDUCED_STEP_MS)}
              duration={duration(WELCOME_SUBTITLE_DURATION_MS)}
              blur={false}
              className={side ? 'items-start' : 'w-full items-center'}>
              <View className="bg-card w-full max-w-md flex-row items-start gap-3 rounded-2xl p-4 shadow-sm shadow-black/[0.04]">
                <View className="bg-accent-soft size-10 items-center justify-center rounded-xl">
                  <Icon name="lock" className="text-accent-strong size-5" />
                </View>
                <View className="min-w-0 flex-1 gap-0.5">
                  <Text variant="label">{t('screens.welcome.promise')}</Text>
                  <Text variant="caption" className="text-foreground-secondary">
                    {t('screens.welcome.promise-hint')}
                  </Text>
                </View>
              </View>
            </BlurReveal>

            <BlurReveal
              delay={delay(WELCOME_CTA_DELAY_MS, WELCOME_REDUCED_STEP_MS + WELCOME_REDUCED_STEP_MS / 3)}
              duration={duration(WELCOME_CTA_DURATION_MS)}
              blur={false}
              scale
              className={side ? 'items-start' : 'w-full items-center'}>
              <View className={cn('w-full max-w-md gap-3', side ? 'items-start' : 'items-stretch')}>
                <Button onPress={handleStart} size="lg" className={cn('gap-3', side ? 'min-w-56' : null)}>
                  <Text>{t('screens.welcome.cta')}</Text>
                  <Animated.View style={iconStyle}>
                    <MorphIcon name="arrow-right" size={20} color={iconColor} />
                  </Animated.View>
                </Button>
                {IS_NATIVE ? (
                  <Button variant="ghost" onPress={handleInvitation}>
                    <Icon name="scan-barcode" />
                    <Text>{t('screens.welcome.join-invitation')}</Text>
                  </Button>
                ) : null}
                <Text variant="caption" className={cn('max-w-sm', side ? 'text-left' : 'self-center text-center')}>
                  {t('screens.welcome.requirement')}
                </Text>
              </View>
            </BlurReveal>
          </View>
        </View>
      </ScrollView>
      <View className="absolute right-0 top-0" style={{ paddingTop: insets.top + 12, paddingRight: 16 }}>
        <LanguageSwitch />
      </View>
    </View>
  );
}
