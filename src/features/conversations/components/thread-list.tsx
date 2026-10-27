import type { LegendListRenderItemProps } from '@legendapp/list/react-native';
import type { ReactNode } from 'react';
import { View } from 'react-native';
import { KeyboardStickyView } from 'react-native-keyboard-controller';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { IConversationMessageCacheRow } from '@/core/interfaces';
import { IS_WEB } from '@/shared/constants';
import { useReduceMotion } from '@/shared/hooks/use-reduce-motion';
import { useTranslation } from '@/shared/hooks/use-translation';
import { size, space } from '@/shared/theme';
import { Button } from '@/shared/ui/button';
import { Text } from '@/shared/ui/text';
import type { ArgusResult } from '@/features/voice';
import { DaySeparator } from '@/features/conversations/components/day-separator';
import { MessageBubble } from '@/features/conversations/components/message-bubble';
import { ThreadScroller } from '@/features/conversations/components/thread-scroller';
import { TypingIndicator } from '@/features/conversations/components/typing-indicator';
import { useThreadList } from '@/features/conversations/hooks/use-thread-list';
import type { ChatMark } from '@/features/conversations/model/assistant-chat-overlay';
import { repliedBodyOf } from '@/features/conversations/model/conversation-thread';
import { keyboardOffsets } from '@/features/conversations/model/thread-list';
import type { StickyOffset, ThreadItem } from '@/features/conversations/model/thread-list';
import { bubblePresenceOf } from '@/features/conversations/model/thread-results';
import type { AnchoredResults } from '@/features/conversations/model/thread-results';

export type ThreadPaging = {
  live: boolean;
  newest: IConversationMessageCacheRow | null;
  hasOlder: boolean;
  loadOlder: () => Promise<boolean>;
  loadNewer: () => Promise<boolean>;
  toLatest: () => void;
};

export type ThreadDays = { startOfDay: (at: number) => number; dayLabel: (day: number) => string };

export type ThreadChat = {
  typing: boolean;
  marks: ReadonlyMap<string, ChatMark>;
  onRetry?: (clientId: string) => void;
  onDismiss?: (clientId: string) => void;
};

export type ThreadArgus = {
  results: AnchoredResults;
  newestIn: string | null;
  renderResult: (result: ArgusResult) => ReactNode;
};

export type ThreadListProps = {
  rows: readonly IConversationMessageCacheRow[];
  bodies: ReadonlyMap<string, string>;
  paging: ThreadPaging;
  days: ThreadDays;
  chat: ThreadChat;
  argus: ThreadArgus | null;
};

type OlderLoaderProps = { active: boolean };

type LatestPillProps = { unseen: number; onPress: () => void; offset: StickyOffset };

const PILL_FLOAT = {
  position: 'absolute',
  left: 0,
  right: 0,
  bottom: 12,
  alignItems: 'center',
} as const;

const LIST_FILL = { flexGrow: 1, flexShrink: 1, flexBasis: 0, minHeight: 0 } as const;

const LIST_CONTENT = { paddingBottom: size.target + space[3] } as const;

const ESTIMATED_ROW = 72;

const EDGE_SCREENS = 2;

const keyOf = (item: ThreadItem): string => item.key;

const typeOf = (item: ThreadItem): string =>
  item.type === 'result' ? `result:${item.result.kind}` : item.type;

function OlderLoader({ active }: OlderLoaderProps) {
  const { t } = useTranslation();
  const label = t('screens.conversations.latest.loading-older');
  if (!active) return null;
  return (
    <View pointerEvents="none" className="absolute inset-x-0 top-2 items-center">
      <View
        role="progressbar"
        aria-label={label}
        className="bg-surface border-line rounded-full border px-3 py-1">
        <Text variant="caption" tone="2">
          {label}
        </Text>
      </View>
    </View>
  );
}

function LatestPill({ unseen, onPress, offset }: LatestPillProps) {
  const { t } = useTranslation();
  const go = t('screens.conversations.latest.go');
  const count =
    unseen === 1
      ? t('screens.conversations.latest.one')
      : unseen > 1
        ? t('screens.conversations.latest.many', { count: String(unseen) })
        : null;
  return (
    <KeyboardStickyView offset={offset} pointerEvents="box-none" style={PILL_FLOAT}>
      {count ? (
        <Button
          compact
          glass
          label={{ shown: count, spoken: `${count}. ${go}` }}
          trailing={{ icon: 'chevd' }}
          onPress={onPress}
        />
      ) : (
        <Button iconOnly glass icon="chevd" label={go} onPress={onPress} />
      )}
    </KeyboardStickyView>
  );
}

export function ThreadList({ rows, bodies, paging, days, chat, argus }: ThreadListProps) {
  const insets = useSafeAreaInsets();
  const reduceMotion = useReduceMotion();
  const offsets = keyboardOffsets(insets.bottom);
  const thread = useThreadList({
    rows,
    startOfDay: days.startOfDay,
    typing: chat.typing,
    results: argus?.results,
    reduceMotion,
    ...paging,
  });

  const presenceOf = (message: IConversationMessageCacheRow) => {
    if (!argus || message.direction !== 'in') return null;
    const results = argus.results.byRow.get(message.id);
    return { state: bubblePresenceOf(results), live: message.id === argus.newestIn };
  };

  const renderItem = ({ item }: LegendListRenderItemProps<ThreadItem>) => {
    if (item.type === 'day') return <DaySeparator label={days.dayLabel(item.day)} />;
    if (item.type === 'typing') return <TypingIndicator />;
    if (item.type === 'result')
      return <View className="pt-2 pl-9">{argus?.renderResult(item.result)}</View>;
    return (
      <MessageBubble
        message={item.message}
        repliedBody={repliedBodyOf(item.message, bodies)}
        mark={chat.marks.get(item.key)}
        groupStart={item.groupStart}
        groupEnd={item.groupEnd}
        presence={presenceOf(item.message)}
        onRetry={chat.onRetry}
        onDismiss={chat.onDismiss}
      />
    );
  };

  return (
    <View className="min-h-0 flex-1">
      <ThreadScroller
        listRef={thread.listRef}
        keyboardOffset={offsets.list}
        data={thread.items}
        renderItem={renderItem}
        keyExtractor={keyOf}
        getItemType={typeOf}
        extraData={[bodies, chat, argus, days]}
        estimatedItemSize={ESTIMATED_ROW}
        recycleItems
        initialScrollAtEnd
        alignItemsAtEnd
        maintainScrollAtEnd={paging.live ? { animated: !reduceMotion } : false}
        maintainVisibleContentPosition
        onScroll={thread.onScroll}
        onLoad={thread.onLoad}
        onStartReachedThreshold={EDGE_SCREENS}
        onEndReachedThreshold={EDGE_SCREENS}
        contentContainerStyle={LIST_CONTENT}
        showsVerticalScrollIndicator={IS_WEB}
        keyboardShouldPersistTaps="handled"
        style={LIST_FILL}
      />
      <OlderLoader active={thread.loadingOlder} />
      {!thread.atEnd || !paging.live ? (
        <LatestPill unseen={thread.unseen} onPress={thread.goToLatest} offset={offsets.pill} />
      ) : null}
    </View>
  );
}
