import { useRouter } from 'expo-router';
import type { TranslationKey } from '@/core/types';
import { useCapabilities } from '@/shared/hooks/use-capabilities';
import { useTranslation } from '@/shared/hooks/use-translation';
import { Avatar } from '@/shared/ui/avatar';
import type { IconGlyph } from '@/shared/ui/icon';
import { Row } from '@/shared/ui/row';
import { Section } from '@/shared/ui/section';

type TrySectionProps = { onNight?: () => void };

type Pledge = { icon: IconGlyph; title: TranslationKey; detail: TranslationKey };

const PROMISES: readonly Pledge[] = [
  {
    icon: 'user',
    title: 'screens.security.promise.family',
    detail: 'screens.security.promise.family-detail',
  },
  {
    icon: 'alert',
    title: 'screens.security.promise.strangers',
    detail: 'screens.security.promise.strangers-detail',
  },
  {
    icon: 'mic',
    title: 'screens.security.promise.talk',
    detail: 'screens.security.promise.talk-detail',
  },
  {
    icon: 'lock',
    title: 'screens.security.promise.private',
    detail: 'screens.security.promise.private-detail',
  },
  {
    icon: 'play',
    title: 'screens.security.promise.clips',
    detail: 'screens.security.promise.clips-detail',
  },
];

export function TrySection({ onNight }: TrySectionProps) {
  const { t } = useTranslation();
  const router = useRouter();
  const { guard, isOwner } = useCapabilities();
  const openVisits = () => router.push('/security/visits');
  const openFamily = () => router.push('/users');
  if (!onNight && !guard.manageGuests && !isOwner) return null;
  return (
    <Section title={t('screens.security.try.title')}>
      {onNight ? (
        <Row
          leading={<Avatar icon="moon" tone="accent" />}
          title={t('screens.security.try.night')}
          meta={t('screens.security.try.night-detail')}
          onPress={onNight}
        />
      ) : null}
      {guard.manageGuests ? (
        <Row
          leading={<Avatar icon="door" />}
          title={t('screens.security.try.visit')}
          meta={t('screens.security.try.visit-detail')}
          onPress={openVisits}
        />
      ) : null}
      {isOwner ? (
        <Row
          leading={<Avatar icon="users" />}
          title={t('screens.security.try.family')}
          meta={t('screens.security.try.family-detail')}
          onPress={openFamily}
        />
      ) : null}
    </Section>
  );
}

export function PromiseSection() {
  const { t } = useTranslation();
  return (
    <Section title={t('screens.security.promise.title')}>
      {PROMISES.map((promise) => (
        <Row
          key={promise.title}
          leading={
            <Avatar icon={promise.icon} tone={promise.icon === 'alert' ? 'attn' : 'default'} />
          }
          title={t(promise.title)}
          meta={t(promise.detail)}
        />
      ))}
    </Section>
  );
}
