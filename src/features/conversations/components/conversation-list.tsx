import { clsx } from 'clsx';
import { View } from 'react-native';
import type { IConversationSummaryCacheRow } from '@/core/interfaces';
import { useTranslation } from '@/shared/hooks/use-translation';
import { Avatar } from '@/shared/ui/avatar';
import { PressableSurface } from '@/shared/ui/pressable';
import { Text } from '@/shared/ui/text';
import { ConversationRow } from '@/features/conversations/components/conversation-row';
import { isArgus } from '@/features/conversations/model/conversation-labels';

export type ConversationListProps = {
  summaries: readonly IConversationSummaryCacheRow[];
  now: number;
  selected: number | null;
  onOpen: (counterpartId: number) => void;
};

type ArgusPinProps = { selected: boolean; onOpen: () => void };

function ArgusPin({ selected, onOpen }: ArgusPinProps) {
  const { t } = useTranslation();
  return (
    <PressableSurface
      a11y={{ label: t('screens.conversations.argus'), role: 'button', selected }}
      onPress={onOpen}
      pressed={{ scale: 'surface', fill: true }}
      className={clsx(
        'rounded-well min-h-row flex-row items-center gap-3 px-2 py-2',
        selected && 'bg-fill'
      )}>
      <Avatar presence="idle" round />
      <View className="min-w-0 flex-1">
        <Text variant="rowTitle">{t('screens.conversations.argus')}</Text>
        <Text variant="rowMeta" tone="2" numberOfLines={1}>
          {t('screens.conversations.argus-meta')}
        </Text>
      </View>
    </PressableSurface>
  );
}

export function ConversationList({ summaries, now, selected, onOpen }: ConversationListProps) {
  const { t } = useTranslation();
  const pinned = summaries.some((summary) => isArgus(summary.counterpartId));
  const members = summaries.filter((summary) => !isArgus(summary.counterpartId));
  return (
    <View className="gap-1">
      {pinned ? null : <ArgusPin selected={selected === 0} onOpen={() => onOpen(0)} />}
      {summaries.map((summary) => (
        <ConversationRow
          key={summary.counterpartId}
          summary={summary}
          now={now}
          selected={selected === summary.counterpartId}
          onOpen={onOpen}
        />
      ))}
      {members.length === 0 ? (
        <View className="gap-1 px-2 pt-4">
          <Text variant="label">{t('screens.conversations.empty')}</Text>
          <Text variant="meta" tone="2">
            {t('screens.conversations.empty-hint')}
          </Text>
        </View>
      ) : null}
    </View>
  );
}
