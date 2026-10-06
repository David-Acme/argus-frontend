import { useRouter } from 'expo-router';
import { View, useWindowDimensions } from 'react-native';
import { AppScreen } from '@/shared/components/layout';
import { BlurReveal } from '@/shared/components/ui/blur-reveal';
import { Button } from '@/shared/components/ui/button';
import { Icon } from '@/shared/components/ui/icon';
import { OrbitHero, type OrbitItem } from '@/shared/components/ui/orbit-hero';
import { Text } from '@/shared/components/ui/text';
import { useAccessView } from '@/shared/hooks/use-capabilities';
import { useReduceMotion } from '@/shared/hooks/use-reduce-motion';
import { useTranslation } from '@/shared/hooks/use-translation';
import { useWindowClass } from '@/shared/hooks/use-window-class';
import { cn } from '@/shared/libs/utils';
import { ModuleRequestButton, moduleIcon } from '@/features/modules';
import { RemindersSection } from '@/features/reminders';
import { ResponseStrip } from '@/features/response';
import { PanicButton } from '@/features/safety';
import { useSignOut } from '@/features/sessions';
import {
  INACTIVE_BREATH_MS,
  INACTIVE_HERO_MAX,
  INACTIVE_HERO_MIN,
  INACTIVE_ORBIT_CHIP,
  INACTIVE_ORBIT_PERIOD_MS,
  INACTIVE_REVEAL_MS,
  INACTIVE_REVEAL_STEP_MS,
} from '@/features/access/constants/inactive-role';
import { inactiveRoleCopy, inactiveRoleOf, inactiveRoleOffers } from '@/features/access/model/inactive-role';

export default function InactiveRoleScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const view = useAccessView();
  const { signOut, signingOut } = useSignOut();
  const { width, height } = useWindowDimensions();
  const { isWide, isShort } = useWindowClass();
  const reduceMotion = useReduceMotion();
  const inactive = inactiveRoleOf(view);

  if (!inactive) return null;

  const copy = inactiveRoleCopy(inactive, t);
  const heroSize = Math.round(
    Math.max(
      INACTIVE_HERO_MIN,
      Math.min(INACTIVE_HERO_MAX, isWide ? height * 0.4 : Math.min(width - 96, height * (isShort ? 0.3 : 0.34)))
    )
  );
  const items: OrbitItem[] =
    inactive.kind === 'module'
      ? [
          { icon: moduleIcon(inactive.moduleId), angle: 205 },
          { icon: 'moon', angle: 325 },
        ]
      : [
          { icon: 'moon', angle: 205 },
          { icon: 'lock', angle: 325 },
        ];
  const offers = inactiveRoleOffers(view, inactive);
  const delay = (step: number) => (reduceMotion ? 0 : step * INACTIVE_REVEAL_STEP_MS);

  return (
    <AppScreen>
      {offers.alerts ? <ResponseStrip className="w-full max-w-lg self-center pb-2" /> : null}
      <View
        className={cn(
          'w-full flex-1 justify-center self-center py-6',
          isWide ? 'max-w-4xl flex-row items-center gap-14' : 'max-w-lg items-center gap-8'
        )}>
        <BlurReveal delay={0} duration={INACTIVE_REVEAL_MS} blur={false} scale>
          <OrbitHero
            size={heroSize}
            label={t('screens.access.inactive.hero-label')}
            items={items}
            orbitMs={INACTIVE_ORBIT_PERIOD_MS}
            breathMs={INACTIVE_BREATH_MS}
            chipSize={INACTIVE_ORBIT_CHIP}
          />
        </BlurReveal>

        <View className={cn('gap-6', isWide ? 'max-w-md flex-1 items-start' : 'w-full items-center')}>
          <BlurReveal delay={delay(1)} duration={INACTIVE_REVEAL_MS} className={isWide ? 'items-start' : 'items-center'}>
            <View className={cn('gap-3', isWide ? 'items-start' : 'items-center')}>
              <Text variant="micro" className="font-semibold tracking-wide uppercase">
                {t('screens.access.inactive.eyebrow')}
              </Text>
              <Text variant="title" className={isWide ? 'text-left' : 'text-center'}>
                {copy.title}
              </Text>
              <Text
                variant="body"
                className={cn('text-foreground-secondary max-w-md', isWide ? 'text-left' : 'text-center')}>
                {copy.body}
              </Text>
            </View>
          </BlurReveal>

          {offers.panic ? (
            <BlurReveal delay={delay(2)} duration={INACTIVE_REVEAL_MS} blur={false} className="w-full max-w-md">
              <View className="bg-card gap-3 rounded-3xl p-4 shadow-sm shadow-black/[0.04]">
                <View className="flex-row items-center gap-2">
                  <Icon name="shield-check" className="text-accent-strong size-4" />
                  <Text variant="label">{t('screens.access.inactive.always')}</Text>
                </View>
                <PanicButton />
              </View>
            </BlurReveal>
          ) : null}

          {offers.reminders ? (
            <BlurReveal delay={delay(3)} duration={INACTIVE_REVEAL_MS} blur={false} className="w-full max-w-md">
              <RemindersSection query="" />
            </BlurReveal>
          ) : null}

          <BlurReveal
            delay={delay(4)}
            duration={INACTIVE_REVEAL_MS}
            blur={false}
            className={isWide ? 'items-start' : 'w-full items-center'}>
            <View className={cn('w-full max-w-md gap-2', isWide ? 'items-start' : 'items-stretch')}>
              {offers.moduleRequest ? (
                <ModuleRequestButton moduleId={offers.moduleRequest.moduleId} name={offers.moduleRequest.moduleName} />
              ) : null}
              <Button onPress={() => router.push('/profile')}>
                <Icon name="user" />
                <Text>{t('screens.access.inactive.profile')}</Text>
              </Button>
              <Button variant="ghost" loading={signingOut} onPress={() => void signOut()}>
                <Text>{t('screens.access.inactive.sign-out')}</Text>
              </Button>
            </View>
          </BlurReveal>
        </View>
      </View>
    </AppScreen>
  );
}
