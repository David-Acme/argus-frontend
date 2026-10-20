import {
  LegendList,
  type LegendListProps,
  type LegendListRef,
  type LegendListRenderItemProps,
} from '@legendapp/list/react-native';
import type { ReactNode, Ref } from 'react';
import type { ThreadItem } from '@/features/conversations/model/thread-list';

type ThreadScrollerProps = Pick<
  LegendListProps<ThreadItem>,
  | 'keyExtractor'
  | 'getItemType'
  | 'extraData'
  | 'estimatedItemSize'
  | 'recycleItems'
  | 'initialScrollAtEnd'
  | 'alignItemsAtEnd'
  | 'maintainScrollAtEnd'
  | 'maintainVisibleContentPosition'
  | 'onStartReached'
  | 'onStartReachedThreshold'
  | 'contentContainerStyle'
  | 'showsVerticalScrollIndicator'
  | 'keyboardShouldPersistTaps'
  | 'style'
> & {
  data: readonly ThreadItem[];
  renderItem: (props: LegendListRenderItemProps<ThreadItem>) => ReactNode;
  listRef: Ref<LegendListRef>;
  keyboardOffset: number;
};

export function ThreadScroller({ listRef, keyboardOffset, ...props }: ThreadScrollerProps) {
  return <LegendList ref={listRef} {...props} />;
}
