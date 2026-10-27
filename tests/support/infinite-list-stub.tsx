import { Fragment, type ReactElement } from 'react';
import type { InfiniteListState } from '@/shared/hooks/use-infinite-list';

type InfiniteListStubProps<T> = {
  data: readonly T[];
  keyOf: (item: T) => string;
  renderItem: (item: T, index: number) => ReactElement;
  paging?: InfiniteListState;
  maxHeight?: number;
};

export function InfiniteListStub<T>({
  data,
  keyOf,
  renderItem,
  paging,
  maxHeight,
}: InfiniteListStubProps<T>) {
  return (
    <div data-testid="infinite-list" data-footer={paging?.footer ?? 'none'} data-max={maxHeight}>
      {data.map((item, index) => (
        <Fragment key={keyOf(item)}>{renderItem(item, index)}</Fragment>
      ))}
      <button type="button" aria-label="end-reached" onClick={() => paging?.onEndReached()} />
    </div>
  );
}
