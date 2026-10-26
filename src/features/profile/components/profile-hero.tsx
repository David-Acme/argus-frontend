import { clsx } from 'clsx';
import { useRouter } from 'expo-router';
import { View } from 'react-native';
import type { TranslationKey } from '@/core/types';
import { useDateFormatter } from '@/shared/hooks/use-date-formatter';
import { useTranslation } from '@/shared/hooks/use-translation';
import { useThemeTokens } from '@/shared/theme';
import { Avatar } from '@/shared/ui/avatar';
import { Button } from '@/shared/ui/button';
import { Icon } from '@/shared/ui/icon';
import { PressableSurface } from '@/shared/ui/pressable';
import { Text } from '@/shared/ui/text';
import { PROFILE_HREF } from '@/features/profile/constants/profile-links.constant';
import { useProfileHero } from '@/features/profile/hooks/use-profile-hero';
import type {
  ProfileActions,
  ProfileHero as Hero,
} from '@/features/profile/hooks/use-profile-hero';
import type { HeroLook } from '@/features/profile/model/hero-look';
import type { FactKey, ProfileFact } from '@/features/profile/model/profile-hero';

type ProfileHeroProps = { look: HeroLook };

type WhereProps = { hero: Hero; look: HeroLook };

type FactsProps = { facts: readonly ProfileFact[]; look: HeroLook };

type ActionsProps = { actions: ProfileActions; look: HeroLook };

const FACT_LABEL: Readonly<Record<FactKey, readonly [TranslationKey, TranslationKey]>> = {
  people: ['screens.profile.facts.people.one', 'screens.profile.facts.people.other'],
  cameras: ['screens.profile.facts.cameras.one', 'screens.profile.facts.cameras.other'],
  devices: ['screens.profile.facts.devices.one', 'screens.profile.facts.devices.other'],
};

const DEVICE_LABEL = {
  phone: 'screens.profile.presence.device.phone',
  computer: 'screens.profile.presence.device.computer',
  browser: 'screens.profile.presence.device.browser',
} as const;

function useWhere(hero: Hero): { state: string | null; rest: string } {
  const { t } = useTranslation();
  const { formatTime } = useDateFormatter();
  const { self, device } = hero;
  const state = self
    ? t(self.state === 'home' ? 'screens.profile.presence.home' : 'screens.profile.presence.away')
    : null;
  const since = self?.since
    ? t('screens.profile.presence.since', { time: formatTime(self.since) })
    : null;
  return {
    state,
    rest: [since, device ? t(DEVICE_LABEL[device]) : null].filter(Boolean).join(' · '),
  };
}

function Where({ hero, look }: WhereProps) {
  const { state, rest } = useWhere(hero);
  if (!state && !rest) return null;
  return (
    <View className={clsx('flex-row items-center gap-2', look.compact ? 'mt-1' : 'mt-4')}>
      {look.inlineWhere ? null : <Icon name="home" size="small" tone="accent" />}
      <View className="min-w-0 flex-1">
        <Text variant="meta" tone="2">
          {state ? <Text variant="label">{state}</Text> : null}
          {state && rest ? ' ' : null}
          {rest}
        </Text>
      </View>
    </View>
  );
}

function Facts({ facts, look }: FactsProps) {
  const { t } = useTranslation();
  const router = useRouter();
  const { elevation } = useThemeTokens();
  if (facts.length === 0 || !look.facts) return null;
  const card = { boxShadow: elevation.card };
  return (
    <View
      role="group"
      aria-label={t('screens.profile.facts.label')}
      className={clsx('bg-surface rounded-card flex-row', look.compact ? 'mt-3' : 'mt-4')}
      style={card}>
      {facts.map((fact, index) => {
        const label = t(FACT_LABEL[fact.key][fact.value === 1 ? 0 : 1]);
        return (
          <View key={fact.key} className="min-w-0 flex-1">
            <PressableSurface
              a11y={{ label: `${fact.value} ${label}`, role: 'link' }}
              onPress={() => router.push(fact.href)}
              pressed={{ fill: true }}
              className={clsx(
                'min-h-target items-center justify-center px-2',
                look.compact ? 'py-2' : 'py-3'
              )}>
              {index > 0 ? (
                <View className="border-line absolute inset-y-4 left-0 border-l" />
              ) : null}
              <Text variant="title">{String(fact.value)}</Text>
              <Text variant="caption" tone="2">
                {label}
              </Text>
            </PressableSurface>
          </View>
        );
      })}
    </View>
  );
}

function Actions({ actions, look }: ActionsProps) {
  const { t } = useTranslation();
  const router = useRouter();
  if (!actions.edit && !actions.invite && !actions.qr) return null;
  return (
    <View className={clsx('flex-row gap-2', look.compact ? 'mt-3' : 'mt-4')}>
      {actions.edit ? (
        <View className="flex-1">
          <Button
            block
            label={t('screens.profile.edit')}
            onPress={() => router.push(PROFILE_HREF.people)}
          />
        </View>
      ) : null}
      {actions.invite ? (
        <View className="flex-1">
          <Button
            block
            compact={look.compact}
            variant="primary"
            label={t('screens.profile.invite')}
            onPress={() => router.push(PROFILE_HREF.invite)}
          />
        </View>
      ) : null}
      {actions.qr ? (
        <Button
          iconOnly
          filled
          icon="qr"
          label={t('screens.profile.qr')}
          onPress={() => router.push(PROFILE_HREF.approve)}
        />
      ) : null}
    </View>
  );
}

export function ProfileHero({ look }: ProfileHeroProps) {
  const hero = useProfileHero();
  return (
    <View>
      <View className={clsx('flex-row items-center', look.compact ? 'gap-3' : 'gap-4 pt-2')}>
        <Avatar size={look.portrait} round initial={hero.initials} label={hero.name} />
        <View className="min-w-0 flex-1">
          <Text variant={look.name} heading={1}>
            {hero.name}
          </Text>
          <Text variant="label" tone="2">
            {hero.role}
          </Text>
          {look.inlineWhere ? <Where hero={hero} look={look} /> : null}
        </View>
      </View>
      {look.inlineWhere ? null : <Where hero={hero} look={look} />}
      <Facts facts={hero.facts} look={look} />
      <Actions actions={hero.actions} look={look} />
    </View>
  );
}
