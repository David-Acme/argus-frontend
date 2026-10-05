import { LegendList, type LegendListRef } from '@legendapp/list/react-native';
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  type ComponentType,
  type ReactElement,
} from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';
import type { InfiniteFooter } from '@/core/types';
import { IS_WEB, SCROLLBAR_GUTTER } from '@/shared/constants';
import { Button } from '@/shared/components/ui/button';
import { Text } from '@/shared/components/ui/text';
import type { InfiniteListState } from '@/shared/hooks/use-infinite-list';
import { useTranslation } from '@/shared/hooks/use-translation';
import { INFINITE_END_THRESHOLD } from '@/shared/libs/infinite-list';

type InfiniteListProps<T> = {
  data: readonly T[];
  keyOf: (item: T) => string;
  renderItem: (item: T, index: number) => ReactElement;
  estimatedItemSize: number;
  paging?: InfiniteListState;
  endLabel?: string;
  maxHeight?: number;
  numColumns?: number;
  gap?: number;
  paddingTop?: number;
  paddingBottom?: number;
  paddingRight?: number;
  skeleton?: ReactElement;
  skeletonCount?: number;
  getItemType?: (item: T, index: number) => string;
  extraData?: unknown;
  header?: ComponentType | ReactElement | null;
  scrollIndicator?: boolean;
  recycle?: boolean;
};

type InfiniteFooterViewProps = {
  footer: InfiniteFooter;
  endLabel?: string;
  skeleton?: ReactElement;
  skeletonCount: number;
  numColumns: number;
  gap: number;
  onRetry: () => void;
};

const DEFAULT_SKELETONS = 3;

const FILL: ViewStyle = { flexGrow: 1, flexShrink: 1, flexBasis: 0, minHeight: 0 };

function SkeletonRow() {
  return (
    <View className="flex-row items-center gap-3 rounded-xl px-3 py-2.5">
      <View className="bg-surface-secondary size-9 rounded-full" />
      <View className="flex-1 gap-2">
        <View className="bg-surface-secondary h-3 w-2/3 rounded-full" />
        <View className="bg-surface-secondary h-2.5 w-1/3 rounded-full opacity-70" />
      </View>
    </View>
  );
}

function InfiniteFooterView({
  footer,
  endLabel,
  skeleton,
  skeletonCount,
  numColumns,
  gap,
  onRetry,
}: InfiniteFooterViewProps) {
  const { t } = useTranslation();

  if (footer === 'loading') {
    const columns = Math.max(1, numColumns);
    const count = columns > 1 ? columns : skeletonCount;
    return (
      <View
        accessible
        accessibilityRole="progressbar"
        accessibilityLabel={t('common.list.loading-more')}
        className={columns > 1 ? 'flex-row' : undefined}
        style={{ gap, paddingTop: gap }}>
        {Array.from({ length: count }, (_, index) => (
          <View key={index} className={columns > 1 ? 'min-w-0 flex-1' : undefined}>
            {skeleton ?? <SkeletonRow />}
          </View>
        ))}
      </View>
    );
  }

  if (footer === 'error') {
    return (
      <View className="items-center gap-2 py-4">
        <Text variant="caption" className="text-foreground-secondary">
          {t('common.list.error')}
        </Text>
        <Button variant="outline" size="sm" onPress={onRetry}>
          <Text>{t('common.retry')}</Text>
        </Button>
      </View>
    );
  }

  if (footer === 'end') {
    return (
      <View className="flex-row items-center gap-3 py-4">
        <View className="bg-divider/50 h-hairline flex-1" />
        <Text variant="micro">{endLabel ?? t('common.list.end')}</Text>
        <View className="bg-divider/50 h-hairline flex-1" />
      </View>
    );
  }

  return null;
}

export function InfiniteList<T>({
  data,
  keyOf,
  renderItem,
  estimatedItemSize,
  paging,
  endLabel,
  maxHeight,
  numColumns = 1,
  gap = 0,
  paddingTop = 0,
  paddingBottom = 0,
  paddingRight = 0,
  skeleton,
  skeletonCount = DEFAULT_SKELETONS,
  getItemType,
  extraData,
  header,
  scrollIndicator = false,
  recycle = false,
}: InfiniteListProps<T>) {
  const list = useRef<LegendListRef>(null);
  const reach = useRef<(() => void) | undefined>(undefined);
  const footer = paging?.footer ?? 'none';
  const onEndReached = paging?.onEndReached;
  const loading = paging?.loading ?? false;
  const style = useMemo<ViewStyle>(
    () =>
      maxHeight != null
        ? { maxHeight, flexGrow: 0 }
        : { flexGrow: 1, flexShrink: 1, flexBasis: 0, minHeight: 0 },
    [maxHeight]
  );
  const bleed = useMemo<StyleProp<ViewStyle> | null>(
    () =>
      numColumns > 1 && gap > 0
        ? [{ marginHorizontal: -gap / 2 }, maxHeight != null ? null : FILL]
        : null,
    [gap, maxHeight, numColumns]
  );

  const renderRow = useCallback(
    ({ item, index }: { item: T; index: number }) => renderItem(item, index),
    [renderItem]
  );

  const retry = () => paging?.retry();

  useEffect(() => {
    reach.current = footer === 'loading' ? onEndReached : undefined;
  }, [footer, onEndReached]);

  useEffect(
    () =>
      list.current?.getState().listen('isNearEnd', (near) => {
        if (near) reach.current?.();
      }),
    []
  );

  useEffect(() => {
    if (footer === 'loading' && !loading && list.current?.getState().isNearEnd) onEndReached?.();
  }, [data.length, footer, loading, onEndReached]);

  const content = (
    <LegendList
      ref={list}
      data={data as T[]}
      keyExtractor={keyOf}
      renderItem={renderRow}
      estimatedItemSize={estimatedItemSize}
      numColumns={numColumns}
      columnWrapperStyle={gap > 0 ? { rowGap: gap, columnGap: gap } : undefined}
      getItemType={getItemType}
      extraData={extraData ?? renderItem}
      ListHeaderComponent={header}
      ListFooterComponent={
        <InfiniteFooterView
          footer={footer}
          endLabel={endLabel}
          skeleton={skeleton}
          skeletonCount={skeletonCount}
          numColumns={numColumns}
          gap={gap}
          onRetry={retry}
        />
      }
      onEndReached={onEndReached ? () => onEndReached() : undefined}
      onEndReachedThreshold={INFINITE_END_THRESHOLD}
      nestedScrollEnabled
      style={style}
      contentContainerStyle={{
        paddingTop,
        paddingBottom,
        paddingRight: paddingRight + (scrollIndicator && IS_WEB ? SCROLLBAR_GUTTER : 0),
      }}
      recycleItems={recycle}
      showsVerticalScrollIndicator={scrollIndicator}
    />
  );

  return bleed ? <View style={bleed}>{content}</View> : content;
}
