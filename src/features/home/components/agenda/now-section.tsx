import { useTranslation } from '@/shared/hooks/use-translation';
import { Section } from '@/shared/ui/section';
import { useAgenda } from '@/features/home/hooks/use-agenda';
import { nowList } from '@/features/agenda';
import { nowCount } from '@/features/home/model/agenda-wording';
import { AgendaEmpty } from './agenda-empty';
import { AgendaRow } from './agenda-row';

export function NowSection() {
  const { t } = useTranslation();
  const { visible, synced, items, today, wording, actions } = useAgenda();
  if (!visible) return null;
  const list = nowList(items, wording.now, today);
  const title = t('screens.home.agenda-sections.now');
  if (list.total === 0) {
    return synced ? <AgendaEmpty title={title} /> : null;
  }
  return (
    <Section title={title} meta={nowCount(list, t)}>
      {list.items.map((item) => (
        <AgendaRow key={item.id} item={item} place="now" wording={wording} actions={actions} />
      ))}
    </Section>
  );
}
