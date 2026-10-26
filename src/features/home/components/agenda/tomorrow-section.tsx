import { useTranslation } from '@/shared/hooks/use-translation';
import { Section } from '@/shared/ui/section';
import { useAgenda } from '@/features/home/hooks/use-agenda';
import { dayList } from '@/features/home/model/agenda-items';
import { AgendaRow } from './agenda-row';
import { FreeRow } from './free-row';
import { ReminderEditor } from './reminder-editor';

export function TomorrowSection() {
  const { t } = useTranslation();
  const { visible, synced, items, tomorrow, wording, actions } = useAgenda();
  if (!visible) return null;
  const day = dayList(items, tomorrow);
  if (day.length === 0 && !synced) return null;
  return (
    <>
      <Section title={t('screens.home.agenda-sections.tomorrow')}>
        {day.length === 0 ? (
          <FreeRow
            title={t('screens.home.agenda-sections.free-day')}
            meta={t('screens.home.agenda-sections.free-day-meta')}
          />
        ) : (
          day.map((item) => (
            <AgendaRow key={item.id} item={item} place="day" wording={wording} actions={actions} />
          ))
        )}
      </Section>
      <ReminderEditor actions={actions} />
    </>
  );
}
