import type { ReactNode } from 'react';
import { View } from 'react-native';
import type { AgendaItem } from '@/core/types';
import { Check } from '@/shared/ui/check';
import { Icon } from '@/shared/ui/icon';
import { agendaCheck } from '@/features/agenda/model/agenda-actions';
import type { DayGroup } from '@/features/agenda/model/agenda-days';
import { barOf, freeWords, lineWords } from '@/features/agenda/model/agenda-lines';
import { AgendaLine } from '@/features/agenda/components/agenda-line';
import { DayHead } from '@/features/agenda/components/day-head';
import type { ListContext } from '@/features/agenda/model/agenda-view';

export type AgendaListProps = {
  groups: readonly DayGroup[];
  context: ListContext;
  empty: ReactNode;
};

type ItemLineProps = { item: AgendaItem; context: ListContext };

type FreeDayProps = { context: ListContext };

function Trailing({ item, context }: ItemLineProps) {
  const { actions, now, t } = context;
  const toggles = item.kind !== 'event' && actions.rightsOf(item).toggle;
  if (!item.repeat && !toggles) return null;
  const label = t(item.done ? 'screens.agenda.line.reopen' : 'screens.agenda.line.complete', {
    title: item.title,
  });
  return (
    <>
      {item.repeat ? (
        <Icon name="repeat" size="small" tone="text-3" label={t('screens.agenda.line.repeats')} />
      ) : null}
      {toggles ? (
        <Check state={agendaCheck(item, now)} label={label} onToggle={() => actions.toggle(item)} />
      ) : null}
    </>
  );
}

function ItemLine({ item, context }: ItemLineProps) {
  return (
    <AgendaLine
      title={item.title}
      words={lineWords(item, context)}
      look={barOf(item, context.now, context.viewer)}
      struck={item.done}
      selected={context.selected === item.id}
      trailing={<Trailing item={item} context={context} />}
      onPress={() => context.onOpen(item)}
      testID={`agenda-line-${item.id}`}
    />
  );
}

function FreeDay({ context }: FreeDayProps) {
  const { t } = context;
  return (
    <AgendaLine
      title={t('screens.agenda.line.free')}
      words={{ time: t('screens.agenda.line.all-day'), state: null, meta: '', alert: false }}
      look="free"
    />
  );
}

export function AgendaList({ groups, context, empty }: AgendaListProps) {
  return groups.map((group, index) => (
    <View key={group.at} testID={`agenda-day-${index}`}>
      <DayHead group={group} context={context} />
      {group.entries.length === 0 && index === 0 ? empty : null}
      {group.entries.length === 0 && index > 0 ? <FreeDay context={context} /> : null}
      {group.entries.map((entry) =>
        entry.type === 'item' ? (
          <ItemLine key={entry.item.id} item={entry.item} context={context} />
        ) : (
          <AgendaLine
            key={entry.id}
            title={context.t('screens.agenda.line.free')}
            words={freeWords(entry, context)}
            look="free"
          />
        )
      )}
    </View>
  ));
}
