import type { TranslationKey } from '@/core/types';
import { useTranslation } from '@/shared/hooks/use-translation';
import { Avatar } from '@/shared/ui/avatar';
import type { IconGlyph } from '@/shared/ui/icon';
import { Row } from '@/shared/ui/row';
import { Section } from '@/shared/ui/section';

type Step = { icon: IconGlyph; title: TranslationKey; body: TranslationKey };

const STEPS: readonly Step[] = [
  {
    icon: 'mic',
    title: 'screens.projects.guide.ask-title',
    body: 'screens.projects.guide.ask-body',
  },
  {
    icon: 'users',
    title: 'screens.projects.guide.share-title',
    body: 'screens.projects.guide.share-body',
  },
  {
    icon: 'check',
    title: 'screens.projects.guide.states-title',
    body: 'screens.projects.guide.states-body',
  },
  {
    icon: 'cal',
    title: 'screens.projects.guide.dates-title',
    body: 'screens.projects.guide.dates-body',
  },
];

export function ProjectsGuide() {
  const { t } = useTranslation();
  return (
    <Section title={t('screens.projects.guide.title')}>
      {STEPS.map((step) => (
        <Row
          key={step.title}
          leading={<Avatar icon={step.icon} />}
          title={t(step.title)}
          meta={t(step.body)}
        />
      ))}
    </Section>
  );
}
