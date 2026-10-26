import type { TranslationKey } from '@/core/types';
import { useTranslation } from '@/shared/hooks/use-translation';
import { Avatar } from '@/shared/ui/avatar';
import type { IconGlyph } from '@/shared/ui/icon';
import { Row } from '@/shared/ui/row';
import { Section } from '@/shared/ui/section';
import { itemsOf } from '@/features/agenda/model/agenda-days';
import type { DayGroup } from '@/features/agenda/model/agenda-days';
import { dayWord } from '@/features/agenda/model/agenda-lines';
import type { ListContext } from '@/features/agenda/components/agenda-list';

export type NextDaysProps = { groups: readonly DayGroup[]; context: ListContext };

type Step = { icon: IconGlyph; title: TranslationKey; body: TranslationKey };

const STEPS: readonly Step[] = [
  { icon: 'mic', title: 'screens.agenda.guide.ask-title', body: 'screens.agenda.guide.ask-body' },
  {
    icon: 'bell',
    title: 'screens.agenda.guide.warn-title',
    body: 'screens.agenda.guide.warn-body',
  },
  {
    icon: 'users',
    title: 'screens.agenda.guide.share-title',
    body: 'screens.agenda.guide.share-body',
  },
  {
    icon: 'check',
    title: 'screens.agenda.guide.projects-title',
    body: 'screens.agenda.guide.projects-body',
  },
];

export function NextDays({ groups, context }: NextDaysProps) {
  const { t, date } = context;
  return (
    <Section title={t('screens.agenda.aside.next')}>
      {groups.map((group) => {
        const items = itemsOf(group);
        const day = t('screens.agenda.aside.day-and-name', {
          day: date.formatDayMonth(new Date(group.at)),
          name: dayWord(group.at, context),
        });
        return (
          <Row
            key={group.at}
            title={day}
            meta={
              items.length === 0
                ? t('screens.agenda.aside.next-free')
                : items.map((item) => item.title).join(' · ')
            }
            trailing={items.length === 0 ? undefined : String(items.length)}
          />
        );
      })}
    </Section>
  );
}

export function AgendaGuide() {
  const { t } = useTranslation();
  return (
    <Section title={t('screens.agenda.guide.title')}>
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
