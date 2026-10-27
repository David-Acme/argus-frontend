import type { LegendListRenderItemProps, ViewToken } from '@legendapp/list/react-native';
import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { IConversationMessageCacheRow } from '@/core/interfaces';
import { IS_WEB } from '@/shared/constants';
import { useReduceMotion } from '@/shared/hooks/use-reduce-motion';
import { useTranslation } from '@/shared/hooks/use-translation';
import { space, useWindowHeight, useWindowWidth } from '@/shared/theme';
import { Text } from '@/shared/ui/text';
import { DaySeparator } from '@/features/conversations/components/day-separator';
import { ScrollDown } from '@/features/conversations/components/scroll-down';
import { ThreadItemView } from '@/features/conversations/components/thread-item';
import type {
  ThreadArgus,
  ThreadChat,
  ThreadDays,
} from '@/features/conversations/components/thread-item';
import { ThreadScroller } from '@/features/conversations/components/thread-scroller';
import { ThreadSnapshot } from '@/features/conversations/components/thread-snapshot';
import { useThreadList } from '@/features/conversations/hooks/use-thread-list';
import { notePlayer } from '@/features/conversations/services/note-player';
import {
  estimatedItemSizeOf,
  floatingDayOf,
  keyboardOffsets,
  THREAD_TAIL,
} from '@/features/conversations/model/thread-list';
import type { ThreadItem } from '@/features/conversations/model/thread-list';

export type {
  ThreadArgus,
  ThreadChat,
  ThreadDays,
} from '@/features/conversations/components/thread-item';

export type ThreadPaging = {
  live: boolean;
  newest: IConversationMessageCacheRow | null;
  hasOlder: boolean;
  loadOlder: () => Promise<boolean>;
  loadNewer: () => Promise<boolean>;
  toLatest: () => void;
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

type Viewable = { viewableItems: ViewToken<ThreadItem>[] };

const LIST_FILL = { flexGrow: 1, flexShrink: 1, flexBasis: 0, minHeight: 0 } as const;

const LIST_BOTTOM = space[3];

const LIST_CONTENT = { paddingBottom: LIST_BOTTOM } as const;

const FLOATING_DAY = { position: 'absolute', top: space[2], left: 0, right: 0 } as const;

const EDGE_SCREENS = 2;

const ANY_PIXEL = { itemVisiblePercentThreshold: 1 } as const;

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

export function ThreadList({ rows, bodies, paging, days, chat, argus }: ThreadListProps) {
  const insets = useSafeAreaInsets();
  const width = useWindowWidth();
  const height = useWindowHeight();
  const reduceMotion = useReduceMotion();
  const offsets = keyboardOffsets(insets.bottom);
  const [ready, setReady] = useState(false);
  const [floatingDay, setFloatingDay] = useState<number | null>(null);
  const thread = useThreadList({
    rows,
    startOfDay: days.startOfDay,
    typing: chat.typing,
    results: argus?.results,
    reduceMotion,
    ...paging,
  });
  const view = { bodies, days, chat, argus };

  const renderItem = ({ item }: LegendListRenderItemProps<ThreadItem>) => (
    <ThreadItemView item={item} {...view} />
  );

  const onLoad = () => {
    thread.onLoad();
    setReady(true);
  };

  const onViewable = ({ viewableItems }: Viewable) =>
    setFloatingDay(floatingDayOf(viewableItems.map((token) => token.item)));

  useEffect(() => () => notePlayer.stop(), []);

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
        estimatedItemSize={estimatedItemSizeOf({ items: thread.items, width })}
        estimatedListSize={{ width, height }}
        recycleItems
        initialScrollAtEnd
        alignItemsAtEnd
        maintainScrollAtEnd={paging.live ? { animated: !reduceMotion } : false}
        maintainVisibleContentPosition
        onScroll={thread.onScroll}
        onLoad={onLoad}
        onViewableItemsChanged={onViewable}
        viewabilityConfig={ANY_PIXEL}
        onStartReachedThreshold={EDGE_SCREENS}
        onEndReachedThreshold={EDGE_SCREENS}
        contentContainerStyle={LIST_CONTENT}
        showsVerticalScrollIndicator={IS_WEB}
        keyboardShouldPersistTaps="handled"
        style={LIST_FILL}
      />
      {ready ? null : (
        <ThreadSnapshot items={thread.items.slice(-THREAD_TAIL)} bottom={LIST_BOTTOM} {...view} />
      )}
      {ready && floatingDay !== null ? (
        <View pointerEvents="none" style={FLOATING_DAY}>
          <DaySeparator floating label={days.dayLabel(floatingDay)} />
        </View>
      ) : null}
      <OlderLoader active={thread.loadingOlder} />
      {!thread.atEnd || !paging.live ? (
        <ScrollDown unseen={thread.unseen} onPress={thread.goToLatest} offset={offsets.pill} />
      ) : null}
    </View>
  );
}
