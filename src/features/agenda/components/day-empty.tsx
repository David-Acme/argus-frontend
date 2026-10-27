import { useTranslation } from '@/shared/hooks/use-translation';
import { Notice } from '@/shared/ui/notice';
import { Empty } from '@/shared/ui/resource-view';
import type { ItemKind } from '@/features/agenda/model/item-draft';

export type DayEmptyProps = { today: boolean; create?: { kind: ItemKind; onPress: () => void } };

export function DayEmpty({ today, create }: DayEmptyProps) {
  const { t } = useTranslation();
  const title = t(today ? 'screens.agenda.empty.today-title' : 'screens.agenda.empty.day-title');
  if (create)
    return (
      <Empty
        centred
        icon="cal"
        message={title}
        detail={t('screens.agenda.empty.body')}
        action={{
          label: t(
            create.kind === 'event'
              ? 'screens.agenda.sheet.new-event'
              : 'screens.agenda.sheet.new-task'
          ),
          onPress: create.onPress,
        }}
      />
    );
  return <Notice icon="cal" title={title} body={t('screens.agenda.empty.read-only')} />;
}
