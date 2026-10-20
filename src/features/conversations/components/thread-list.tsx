import type { LegendListRenderItemProps } from '@legendapp/list/react-native';
import { Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { IConversationMessageCacheRow } from '@/core/interfaces';
import { Icon } from '@/shared/components/ui/icon';
import { Text } from '@/shared/components/ui/text';
import { IS_WEB } from '@/shared/constants';
import { useReduceMotion } from '@/shared/hooks/use-reduce-motion';
import { useTranslation } from '@/shared/hooks/use-translation';
import { DaySeparator } from '@/features/conversations/components/day-separator';
import { MessageBubble } from '@/features/conversations/components/message-bubble';
import { TypingIndicator } from '@/features/conversations/components/typing-indicator';
import { useThreadList } from '@/features/conversations/hooks/use-thread-list';
import type { ChatMark } from '@/features/conversations/model/assistant-chat-overlay';
import { repliedBodyOf } from '@/features/conversations/model/conversation-thread';
import type { ThreadItem } from '@/features/conversations/model/thread-list';
import { ThreadScroller } from './thread-scroller';

type ThreadListProps = {
  rows: readonly IConversationMessageCacheRow[];
  startOfDay: (at: number) => number;
  dayLabel: (day: number) => string;
  typing: boolean;
  bodies: ReadonlyMap<string, string>;
  marks: ReadonlyMap<string, ChatMark>;
  onRetry?: (clientId: string) => void;
  onDismiss?: (clientId: string) => void;
};

type LatestPillProps = {
  unseen: number;
  onPress: () => void;
};

const ESTIMATED_ROW = 72;

const keyOf = (item: ThreadItem): string => item.key;

const typeOf = (item: ThreadItem): ThreadItem['type'] => item.type;

export function ThreadList({
  rows,
  startOfDay,
  dayLabel,
  typing,
  bodies,
  marks,
  onRetry,
  onDismiss,
}: ThreadListProps) {
  const insets = useSafeAreaInsets();
  const reduceMotion = useReduceMotion();
  const thread = useThreadList({ rows, startOfDay, typing, reduceMotion });

  const renderItem = ({ item }: LegendListRenderItemProps<ThreadItem>) => {
    if (item.type === 'day') return <DaySeparator label={dayLabel(item.day)} />;
    if (item.type === 'typing')
      return (
        <View className="pt-3">
          <TypingIndicator />
        </View>
      );
    return (
      <MessageBubble
        message={item.message}
        repliedBody={repliedBodyOf(item.message, bodies)}
        mark={marks.get(item.key)}
        groupStart={item.groupStart}
        groupEnd={item.groupEnd}
        onRetry={onRetry}
        onDismiss={onDismiss}
      />
    );
  };

  return (
    <View className="min-h-0 flex-1">
      <ThreadScroller
        listRef={thread.listRef}
        keyboardOffset={insets.bottom}
        data={thread.items}
        renderItem={renderItem}
        keyExtractor={keyOf}
        getItemType={typeOf}
        extraData={[bodies, marks, dayLabel, onRetry, onDismiss]}
        estimatedItemSize={ESTIMATED_ROW}
        recycleItems
        initialScrollAtEnd
        alignItemsAtEnd
        maintainScrollAtEnd={{ animated: !reduceMotion }}
        maintainVisibleContentPosition
        onStartReached={thread.hasOlder ? thread.loadOlder : undefined}
        onStartReachedThreshold={1}
        contentContainerStyle={{ paddingBottom: 12 }}
        showsVerticalScrollIndicator={IS_WEB}
        keyboardShouldPersistTaps="handled"
        style={{ flexGrow: 1, flexShrink: 1, flexBasis: 0, minHeight: 0 }}
      />
      {!thread.atEnd ? <LatestPill unseen={thread.unseen} onPress={thread.goToLatest} /> : null}
    </View>
  );
}

function LatestPill({ unseen, onPress }: LatestPillProps) {
  const { t } = useTranslation();
  const count =
    unseen === 1
      ? t('screens.conversations.latest.one')
      : unseen > 1
        ? t('screens.conversations.latest.many', { count: String(unseen) })
        : null;
  const go = t('screens.conversations.latest.go');

  return (
    <View pointerEvents="box-none" className="absolute inset-x-0 bottom-3 items-center">
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={count ? `${count}. ${go}` : go}
        accessibilityLiveRegion={count ? 'polite' : 'none'}
        onPress={onPress}
        hitSlop={8}
        className="bg-card border-border min-h-10 flex-row items-center gap-1.5 rounded-full border px-3.5 shadow-md shadow-black/10 active:opacity-80">
        {count ? (
          <Text variant="label" className="text-foreground">
            {count}
          </Text>
        ) : null}
        <Icon name="chevron-down" className="text-foreground size-5" />
      </Pressable>
    </View>
  );
}
