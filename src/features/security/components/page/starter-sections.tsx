import type { TranslationKey } from '@/core/types';
import { useTranslation } from '@/shared/hooks/use-translation';
import { Avatar } from '@/shared/ui/avatar';
import type { IconGlyph } from '@/shared/ui/icon';
import { Row } from '@/shared/ui/row';
import { Section } from '@/shared/ui/section';

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
