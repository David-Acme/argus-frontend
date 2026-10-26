import { useRouter } from 'expo-router';
import { CAPABILITY, FREE_SLOT_RULES } from '@/shared/constants';
import { useCapabilities } from '@/shared/hooks/use-capabilities';
import { useTranslation } from '@/shared/hooks/use-translation';
import { Section } from '@/shared/ui/section';
import { useAgenda } from '@/features/home/hooks/use-agenda';
import { dayList, dayTimeline } from '@/features/agenda';
import { AgendaRow } from './agenda-row';
import { FreeRow } from './free-row';

export function TodaySection() {
  const { t } = useTranslation();
  const router = useRouter();
  const { has } = useCapabilities();
  const { visible, synced, items, today, wording, actions } = useAgenda();
  if (!visible) return null;
  const { now, date } = wording;
  const day = dayList(items, today);
  if (day.length === 0 && !synced) return null;
  const openAgenda = () => router.push('/agenda');
  const timeline = dayTimeline(day, { ...FREE_SLOT_RULES, after: now });
  const action = has(CAPABILITY.agendaRead)
    ? {
        label: t('screens.home.agenda-sections.open-agenda'),
        onPress: openAgenda,
      }
    : undefined;
  return (
    <Section title={t('screens.home.agenda-sections.today')} action={action}>
      {timeline.length === 0 ? (
        <FreeRow
          title={t('screens.home.agenda-sections.free-day')}
          meta={t('screens.home.agenda-sections.free-day-meta')}
        />
      ) : (
        timeline.map((entry) =>
          entry.type === 'item' ? (
            <AgendaRow
              key={entry.item.id}
              item={entry.item}
              place="day"
              wording={wording}
              actions={actions}
            />
          ) : (
            <FreeRow
              key={entry.id}
              title={t('screens.home.agenda-sections.free')}
              meta={date.formatTimeRange(new Date(entry.from), new Date(entry.to))}
            />
          )
        )
      )}
    </Section>
  );
}
