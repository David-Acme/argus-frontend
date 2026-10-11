import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ScrollView, View, useWindowDimensions, type LayoutChangeEvent } from 'react-native';
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
import { MorphIcon } from '@/shared/components/ui/morph-icon';
import { Text } from '@/shared/components/ui/text';
import { colorTokens, IS_NATIVE } from '@/shared/constants';
import { useReduceMotion } from '@/shared/hooks/use-reduce-motion';
import { useTranslation } from '@/shared/hooks/use-translation';
import { useWindowClass } from '@/shared/hooks/use-window-class';
import { cn } from '@/shared/libs/utils';
import { LanguageSwitch } from '@/features/auth/components/language-switch';
import { WelcomeHero } from '@/features/auth/components/welcome-mascot/welcome-hero';
import { MASCOT_STAGE } from '@/features/auth/constants/welcome-mascot';
import {
  WELCOME_COMPACT_GAP,
  WELCOME_TOP_BAR,
  WELCOME_CTA_DELAY_MS,
  WELCOME_CTA_DURATION_MS,
  WELCOME_HERO_SCALE_MAX,
  WELCOME_HERO_SCALE_MIN,
  WELCOME_HERO_SIDE_MAX,
  WELCOME_ICON_DRIFT_DURATION_MS,
  WELCOME_ICON_DRIFT_PX,
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
  const [copyHeight, setCopyHeight] = useState(0);
  const stackRoom =
    height - insets.top - insets.bottom - WELCOME_TOP_BAR - copyHeight - WELCOME_COMPACT_GAP * 2;
  const heroRoom = side
    ? Math.min(
        (height * 0.55) / MASCOT_STAGE.height,
        (width * 0.45) / MASCOT_STAGE.width,
        WELCOME_HERO_SIDE_MAX
      )
    : Math.min(
        (width - 48) / MASCOT_STAGE.width,
        (copyHeight > 0 ? stackRoom : height * 0.36) / MASCOT_STAGE.height
      );
  const heroScale = Math.max(WELCOME_HERO_SCALE_MIN, Math.min(WELCOME_HERO_SCALE_MAX, heroRoom));
  const handleCopyLayout = useCallback(
    (event: LayoutChangeEvent) => setCopyHeight(Math.ceil(event.nativeEvent.layout.height)),
    []
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
      withTiming(WELCOME_ICON_DRIFT_PX, {
        duration: WELCOME_ICON_DRIFT_DURATION_MS,
        easing: Easing.inOut(Easing.cubic),
      }),
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
          paddingTop: insets.top + WELCOME_TOP_BAR,
          paddingBottom: insets.bottom + WELCOME_COMPACT_GAP,
          paddingHorizontal: 24,
        }}>
        <View
          className={cn(
            'w-full self-center',
            side
              ? 'max-w-5xl flex-row items-center justify-center gap-16'
              : 'max-w-lg items-center gap-6'
          )}>
          <WelcomeHero scale={heroScale} label={t('screens.welcome.hero-label')} />

          <View
            onLayout={side ? undefined : handleCopyLayout}
            className={cn(
              side ? 'max-w-md flex-1 items-start gap-6' : 'w-full items-center gap-5'
            )}>
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
                  className={cn(
                    'text-foreground-secondary max-w-md',
                    side ? 'text-left' : 'text-center'
                  )}>
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
              delay={delay(
                WELCOME_CTA_DELAY_MS,
                WELCOME_REDUCED_STEP_MS + WELCOME_REDUCED_STEP_MS / 3
              )}
              duration={duration(WELCOME_CTA_DURATION_MS)}
              blur={false}
              scale
              className={side ? 'items-start' : 'w-full items-center'}>
              <View className={cn('w-full max-w-md gap-3', side ? 'items-start' : 'items-stretch')}>
                <Button
                  onPress={handleStart}
                  size="lg"
                  className={cn('gap-3', side ? 'min-w-56' : null)}>
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
              </View>
            </BlurReveal>
          </View>
        </View>
      </ScrollView>
      <View
        className="absolute top-0 right-0"
        style={{ paddingTop: insets.top + 12, paddingRight: 16 }}>
        <LanguageSwitch />
      </View>
    </View>
  );
}
