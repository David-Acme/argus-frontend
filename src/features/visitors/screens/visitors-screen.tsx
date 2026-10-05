import { useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { View, type LayoutChangeEvent } from 'react-native';
import type { VisitorSummary } from '@/core/types';
import { AppScreen, ScreenHeader } from '@/shared/components/layout';
import { Button } from '@/shared/components/ui/button';
import { EmptyState } from '@/shared/components/ui/empty-state';
import { FilterChips } from '@/shared/components/ui/filter-chips';
import { InfiniteList } from '@/shared/components/ui/infinite-list';
import { Input } from '@/shared/components/ui/input';
import { Panel } from '@/shared/components/ui/panel';
import { Text } from '@/shared/components/ui/text';
import { IS_WEB, SCROLLBAR_GUTTER } from '@/shared/constants';
import { useTranslation } from '@/shared/hooks/use-translation';
import { useWindowClass } from '@/shared/hooks/use-window-class';
import { VisitorCard } from '@/features/visitors/components/visitor-card';
import { VisitorRecognitionOff } from '@/features/visitors/components/visitor-recognition-off';
import { VisitorRetentionPanel } from '@/features/visitors/components/visitor-retention-panel';
import { VISITOR_TILE_ESTIMATE } from '@/features/visitors/constants';
import { useVisitorFeed, useVisitors } from '@/features/visitors/hooks/use-visitors';
import {
  VISITOR_TILE_GAP,
  visitorColumns,
  type VisitorFilter,
} from '@/features/visitors/model/visitor';
import { visitorLabel } from '@/features/visitors/model/visitor-label';

const visitorKey = (visitor: VisitorSummary) => String(visitor.id);

const GUTTER_BLEED = { marginRight: IS_WEB ? -SCROLLBAR_GUTTER : 0 };

const TILE_SKELETON = (
  <View className="gap-2.5 rounded-xl p-2.5">
    <View className="bg-surface-secondary aspect-square w-full rounded-lg" />
    <View className="bg-surface-secondary h-3 w-2/3 rounded-full" />
  </View>
);

export default function VisitorsScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const { isWide } = useWindowClass();
  const visitors = useVisitors();
  const [filter, setFilter] = useState<VisitorFilter>('all');
  const [query, setQuery] = useState('');
  const [merging, setMerging] = useState(false);
  const [mergeTarget, setMergeTarget] = useState<VisitorSummary | null>(null);
  const [selected, setSelected] = useState<number[]>([]);
  const [width, setWidth] = useState(0);
  const feed = useVisitorFeed({ filter, search: query });
  const columns = visitorColumns(width);
  const browsing = filter !== 'all' || query.trim().length > 0;
  const galleryEmpty = !browsing && feed.rows.length === 0;
  const recognitionOff = visitors.settings != null && !visitors.settings.recognitionEnabled;

  const filters = [
    { value: 'all' as const, label: t('screens.visitors.filter-all') },
    { value: 'named' as const, label: t('screens.visitors.filter-named') },
    { value: 'unnamed' as const, label: t('screens.visitors.filter-unnamed') },
    {
      value: 'watchlist' as const,
      label: t('screens.visitors.filter-watchlist'),
      icon: 'siren' as const,
    },
  ];

  const open = useCallback(
    (visitor: VisitorSummary) => {
      if (!merging) {
        router.push(`/users/visitors/${visitor.id}`);
        return;
      }
      if (!mergeTarget) {
        setMergeTarget(visitor);
        return;
      }
      if (visitor.id === mergeTarget.id) return;
      setSelected((current) =>
        current.includes(visitor.id)
          ? current.filter((id) => id !== visitor.id)
          : [...current, visitor.id]
      );
    },
    [mergeTarget, merging, router]
  );

  const renderVisitor = useCallback(
    (visitor: VisitorSummary) => (
      <VisitorCard
        visitor={visitor}
        selectable={merging}
        selected={visitor.id === mergeTarget?.id || selected.includes(visitor.id)}
        onPress={open}
      />
    ),
    [mergeTarget, merging, open, selected]
  );

  const startMerge = () => {
    setMerging(true);
    setMergeTarget(null);
    setSelected([]);
  };

  const cancelMerge = () => {
    setMerging(false);
    setMergeTarget(null);
    setSelected([]);
  };

  const confirmMerge = async () => {
    if (!mergeTarget || selected.length === 0) return;
    const merged = await visitors.merge({ target: mergeTarget, sourceIds: selected });
    if (merged) cancelMerge();
  };

  const measure = (event: LayoutChangeEvent) =>
    setWidth(event.nativeEvent.layout.width + GUTTER_BLEED.marginRight);

  const retention = (
    <VisitorRetentionPanel
      settings={visitors.settings}
      onChange={(days) => void visitors.setRetention(days)}
    />
  );

  const body = galleryEmpty ? (
    <View className="gap-5">
      <Panel>
        {recognitionOff ? (
          <VisitorRecognitionOff variant="panel" onEnabled={() => void visitors.reload()} />
        ) : (
          <EmptyState
            variant="panel"
            icon="scan-face"
            title={t('screens.visitors.empty-title')}
            hint={t('screens.visitors.empty-description')}
          />
        )}
      </Panel>
      {isWide ? null : retention}
    </View>
  ) : (
    <View className="min-h-0 flex-1 gap-4">
      <View className="gap-3">
        <Input
          value={query}
          onChangeText={setQuery}
          placeholder={t('screens.visitors.search')}
          accessibilityLabel={t('screens.visitors.search')}
        />
        <FilterChips options={filters} value={filter} onChange={setFilter} scroll />
      </View>
      {merging ? (
        <Panel className="gap-2">
          <Text variant="label">
            {mergeTarget
              ? t('screens.visitors.merge-pick', { name: visitorLabel(mergeTarget, t) })
              : t('screens.visitors.merge-start')}
          </Text>
          <View className="flex-row flex-wrap gap-2">
            <Button variant="outline" size="sm" onPress={cancelMerge}>
              <Text>{t('screens.visitors.samples-cancel')}</Text>
            </Button>
            <Button
              size="sm"
              disabled={selected.length === 0}
              loading={visitors.pending}
              onPress={() => void confirmMerge()}>
              <Text>
                {t('screens.visitors.merge-selected', { count: String(selected.length) })}
              </Text>
            </Button>
          </View>
        </Panel>
      ) : null}
      <View className="min-h-0 flex-1 basis-0" style={GUTTER_BLEED} onLayout={measure}>
        {feed.rows.length === 0 ? (
          <EmptyState variant="inline" icon="search" title={t('screens.visitors.no-match')} />
        ) : width > 0 ? (
          <InfiniteList
            key={columns}
            data={feed.rows}
            keyOf={visitorKey}
            renderItem={renderVisitor}
            estimatedItemSize={VISITOR_TILE_ESTIMATE}
            numColumns={columns}
            gap={VISITOR_TILE_GAP}
            paging={feed.paging}
            skeleton={TILE_SKELETON}
            header={isWide ? null : <View className="pb-4">{retention}</View>}
            scrollIndicator
          />
        ) : null}
      </View>
    </View>
  );

  return (
    <AppScreen
      bottomNav={false}
      scrollable={false}
      header={
        <ScreenHeader
          title={t('screens.visitors.title')}
          subtitle={t('screens.visitors.subtitle')}
          onBack={() => router.back()}
          action={
            feed.rows.length > 1 && !merging ? (
              <Button variant="outline" size="sm" onPress={startMerge}>
                <Text>{t('screens.visitors.merge-mode')}</Text>
              </Button>
            ) : null
          }
        />
      }
      aside={isWide ? <View className="flex-1 gap-5">{retention}</View> : undefined}>
      {body}
    </AppScreen>
  );
}
