import { clsx } from 'clsx';
import { View } from 'react-native';
import { useTranslation } from '@/shared/hooks/use-translation';
import { Icon } from '@/shared/ui/icon';
import { Text } from '@/shared/ui/text';
import { AskOption, ItemOption } from './command-rows';
import { Listbox } from './listbox';
import type { CommandEmpty, CommandState } from './use-command';

export type CommandEmptyStateProps = {
  state: CommandState;
  empty: Exclude<CommandEmpty, null>;
  hints?: boolean;
  fill: boolean;
};

function Options({ state, hints }: Pick<CommandEmptyStateProps, 'state' | 'hints'>) {
  const offset = state.asks ? 1 : 0;
  const items = state.groups.flatMap((group) => group.items);
  if (offset + items.length === 0) return null;
  return (
    <View className="self-stretch">
      <Listbox id={state.listId}>
        {state.asks ? <AskOption state={state} hints={hints} /> : null}
        {items.map((item, at) => (
          <ItemOption key={item.id} item={item} index={at + offset} state={state} hints={hints} />
        ))}
      </Listbox>
    </View>
  );
}

export function CommandEmptyState({ state, empty, hints, fill }: CommandEmptyStateProps) {
  const { t } = useTranslation();
  const title =
    empty === 'results'
      ? t('common.overlay.command-empty-title', { query: state.query.trim() })
      : t('common.overlay.command-start-title');
  const detail =
    empty === 'results'
      ? t('common.overlay.command-empty-detail')
      : t('common.overlay.command-start-detail');
  return (
    <View
      className={clsx(
        'px-empty-x py-empty-y gap-empty-gap items-center justify-center',
        fill && 'min-h-0 flex-1 basis-0'
      )}>
      <View className="size-well rounded-well bg-fill items-center justify-center">
        <Icon name="search" tone="text-3" />
      </View>
      <View role="status" className="gap-notice-body-top items-center">
        <Text variant="noticeTitle" align="center">
          {title}
        </Text>
        <Text variant="noticeBody" tone="2" align="center">
          {detail}
        </Text>
      </View>
      <Options state={state} hints={hints} />
    </View>
  );
}
