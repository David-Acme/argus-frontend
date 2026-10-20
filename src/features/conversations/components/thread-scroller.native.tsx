import { KeyboardAwareLegendList } from '@legendapp/list/keyboard';
import type {
  LegendListProps,
  LegendListRef,
  LegendListRenderItemProps,
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
  | 'onScroll'
  | 'onStartReachedThreshold'
  | 'onEndReachedThreshold'
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
  return <KeyboardAwareLegendList ref={listRef} keyboardOffset={keyboardOffset} {...props} />;
}
