import { InfiniteList } from '@/shared/components/ui/infinite-list';
import { useTranslation } from '@/shared/hooks/use-translation';
import { SkeletonRow } from '@/shared/ui/resource-view';
import { AskOption, GroupTitle, ItemOption } from './command-rows';
import type { CommandItem } from './command-types';
import { Listbox } from './listbox';
import type { CommandState } from './use-command';

export type CommandRow =
  | { type: 'title'; key: string; title: string }
  | { type: 'ask'; key: string }
  | { type: 'item'; key: string; item: CommandItem; index: number };

export type CommandListProps = {
  state: CommandState;
  hints?: boolean;
  maxHeight?: number;
};

const ROW_ESTIMATE = 52;

export function commandRows(
  state: Pick<CommandState, 'asks' | 'groups'>,
  askTitle: string | null
): CommandRow[] {
  const rows: CommandRow[] = [];
  let index = 0;
  if (state.asks) {
    if (askTitle !== null) rows.push({ type: 'title', key: 'title:ask', title: askTitle });
    rows.push({ type: 'ask', key: 'ask' });
    index = 1;
  }
  state.groups.forEach((group, at) => {
    rows.push({ type: 'title', key: `title:${at}:${group.title}`, title: group.title });
    for (const item of group.items) {
      rows.push({ type: 'item', key: item.id, item, index });
      index += 1;
    }
  });
  return rows;
}

const keyOf = (row: CommandRow) => row.key;

export function CommandList({ state, hints, maxHeight }: CommandListProps) {
  const { t } = useTranslation();
  const rows = commandRows(state, t('common.overlay.command-ask-group'));
  const render = (row: CommandRow) => {
    if (row.type === 'title') return <GroupTitle title={row.title} />;
    if (row.type === 'ask') return <AskOption state={state} hints={hints} />;
    return <ItemOption item={row.item} index={row.index} state={state} hints={hints} />;
  };
  return (
    <Listbox id={state.listId} fill={maxHeight === undefined}>
      <InfiniteList
        data={rows}
        keyOf={keyOf}
        renderItem={render}
        estimatedItemSize={ROW_ESTIMATE}
        paging={state.paging}
        maxHeight={maxHeight}
        skeleton={<SkeletonRow short />}
        extraData={state.selected}
      />
    </Listbox>
  );
}
