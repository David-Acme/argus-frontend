import { useTranslation } from '@/shared/hooks/use-translation';
import { Avatar } from '@/shared/ui/avatar';
import { Row } from '@/shared/ui/row';
import { useInScreenColumn } from '@/shared/ui/screen';
import { Section } from '@/shared/ui/section';
import { useAgenda } from '@/features/home/hooks/use-agenda';
import { listLimit, upcomingReminders } from '@/features/agenda';
import { itemMeta } from '@/features/home/model/agenda-wording';
import { ReminderEditor } from './reminder-editor';

export function UpcomingRemindersSection() {
  const { t } = useTranslation();
  const column = useInScreenColumn();
  const { items, today, wording, actions } = useAgenda();
  const upcoming = upcomingReminders(items, today.to, listLimit(column));
  if (upcoming.length === 0) return null;
  return (
    <>
      <Section title={t('screens.home.agenda-sections.upcoming-reminders')}>
        {upcoming.map((item) => (
          <Row
            key={item.id}
            leading={<Avatar icon="bell" />}
            title={item.title}
            meta={itemMeta(item, 'upcoming', wording)}
            onPress={actions.rightsOf(item).edit ? () => actions.open(item) : undefined}
            testID={`agenda-row-${item.id}`}
          />
        ))}
      </Section>
      <ReminderEditor actions={actions} />
    </>
  );
}
