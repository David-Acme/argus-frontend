import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { View } from 'react-native';
import type { VisitorSummary } from '@/core/types';
import { AppScreen, ScreenHeader } from '@/shared/components/layout';
import { Button } from '@/shared/components/ui/button';
import { EmptyState } from '@/shared/components/ui/empty-state';
import { FilterChips } from '@/shared/components/ui/filter-chips';
import { Input } from '@/shared/components/ui/input';
import { Panel } from '@/shared/components/ui/panel';
import { Text } from '@/shared/components/ui/text';
import { useTranslation } from '@/shared/hooks/use-translation';
import { useWindowClass } from '@/shared/hooks/use-window-class';
import { cn } from '@/shared/libs/utils';
import { VisitorGrid } from '@/features/visitors/components/visitor-grid';
import { VisitorRecognitionOff } from '@/features/visitors/components/visitor-recognition-off';
import { VisitorRetentionPanel } from '@/features/visitors/components/visitor-retention-panel';
import { useVisitors } from '@/features/visitors/hooks/use-visitors';
import { filterVisitors, type VisitorFilter } from '@/features/visitors/model/visitor';
import { visitorLabel } from '@/features/visitors/model/visitor-label';

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
  const all = useMemo(() => visitors.list?.visitors ?? [], [visitors.list]);
  const shown = useMemo(() => filterVisitors(all, filter, query), [all, filter, query]);

  const filters = [
    { value: 'all' as const, label: t('screens.visitors.filter-all') },
    { value: 'named' as const, label: t('screens.visitors.filter-named') },
    { value: 'unnamed' as const, label: t('screens.visitors.filter-unnamed') },
    { value: 'watchlist' as const, label: t('screens.visitors.filter-watchlist'), icon: 'siren' as const },
  ];

  const open = (visitor: VisitorSummary) => {
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
      current.includes(visitor.id) ? current.filter((id) => id !== visitor.id) : [...current, visitor.id]
    );
  };

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

  const body =
    visitors.list && !visitors.list.recognitionEnabled && all.length === 0 ? (
      <Panel>
        <VisitorRecognitionOff variant="panel" onEnabled={() => void visitors.reload()} />
      </Panel>
    ) : all.length === 0 ? (
      <Panel>
        <EmptyState
          variant="panel"
          icon="scan-face"
          title={t('screens.visitors.empty-title')}
          hint={t('screens.visitors.empty-description')}
        />
      </Panel>
    ) : (
      <View className="gap-4">
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
                <Text>{t('screens.visitors.merge-selected', { count: String(selected.length) })}</Text>
              </Button>
            </View>
          </Panel>
        ) : null}
        {shown.length === 0 ? (
          <EmptyState variant="inline" icon="search" title={t('screens.visitors.no-match')} />
        ) : (
          <VisitorGrid
            id="visitors-gallery"
            visitors={shown}
            selectable={merging}
            selectedIds={mergeTarget ? [mergeTarget.id, ...selected] : []}
            onPress={open}
          />
        )}
      </View>
    );

  return (
    <AppScreen
      bottomNav={false}
      fillHeight={false}
      header={
        <ScreenHeader
          title={t('screens.visitors.title')}
          subtitle={t('screens.visitors.subtitle')}
          onBack={() => router.back()}
          action={
            all.length > 1 && !merging ? (
              <Button variant="outline" size="sm" onPress={startMerge}>
                <Text>{t('screens.visitors.merge-mode')}</Text>
              </Button>
            ) : null
          }
        />
      }
      aside={
        <View className={cn(isWide && 'flex-1', 'gap-5')}>
          <VisitorRetentionPanel
            settings={visitors.settings}
            onChange={(days) => void visitors.setRetention(days)}
          />
        </View>
      }>
      {body}
    </AppScreen>
  );
}
