import { useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { View } from 'react-native';
import type { ActivityFilter, ActivityItem } from '@/core/types';
import type { IPeopleDirectoryCacheRow } from '@/core/interfaces';
import { AppScreen, ScreenHeader } from '@/shared/components/layout';
import { Button } from '@/shared/components/ui/button';
import { EmptyState } from '@/shared/components/ui/empty-state';
import { InfiniteList } from '@/shared/components/ui/infinite-list';
import { Panel } from '@/shared/components/ui/panel';
import { Text } from '@/shared/components/ui/text';
import { CAPABILITY, VIEW_CACHE_KEYS } from '@/shared/constants';
import { useViewCacheRows } from '@/shared/hooks/use-cached-rows';
import { useCapabilities } from '@/shared/hooks/use-capabilities';
import { useTranslation } from '@/shared/hooks/use-translation';
import { useModuleCatalog } from '@/features/modules';
import { ActivityFilters } from '@/features/activity/components/activity-filters';
import { ActivityRow } from '@/features/activity/components/activity-row';
import { useActivityFeed } from '@/features/activity/hooks/use-activity-feed';
import { EMPTY_ACTIVITY_FILTER } from '@/features/activity/model/activity-filter';

const ROW_ESTIMATE = 64;
const activityKey = (item: ActivityItem) => String(item.id);
const fullName = (user: IPeopleDirectoryCacheRow) => [user.name, user.lastName].filter(Boolean).join(' ');

export default function ActivityScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const { has } = useCapabilities();
  const allowed = has(CAPABILITY.activityRead);
  const catalog = useModuleCatalog();
  const users = useViewCacheRows<IPeopleDirectoryCacheRow>(VIEW_CACHE_KEYS.peopleUsers);
  const [filter, setFilter] = useState<ActivityFilter>(EMPTY_ACTIVITY_FILTER);
  const feed = useActivityFeed(filter, allowed);
  const names = useMemo(() => new Map(users.map((user) => [Number(user.id), fullName(user)])), [users]);
  const people = useMemo(
    () => users.map((user) => ({ id: Number(user.id), name: fullName(user) })).sort((left, right) => left.name.localeCompare(right.name)),
    [users]
  );
  const modules = useMemo(
    () => (catalog?.modules ?? []).map((module) => ({ id: module.id, name: module.name || t('screens.modules.core-name') })),
    [catalog, t]
  );
  const moduleName = useCallback(
    (moduleId: string) => modules.find((module) => module.id === moduleId)?.name ?? moduleId,
    [modules]
  );

  const render = useCallback(
    (item: ActivityItem) => <ActivityRow item={item} names={names} moduleName={moduleName} />,
    [moduleName, names]
  );

  const back = () => (router.canGoBack() ? router.back() : router.replace('/settings'));

  return (
    <AppScreen
      bottomNav={false}
      scrollable={false}
      header={<ScreenHeader title={t('screens.activity.title')} subtitle={t('screens.activity.subtitle')} onBack={back} />}>
      <View className="min-h-0 flex-1 gap-4">
        <ActivityFilters filter={filter} modules={modules} people={people} onChange={setFilter} />
        <Panel className="min-h-56 flex-1 basis-0 p-1.5">
          {feed.status === 'failed' && feed.rows.length === 0 ? (
            <EmptyState
              variant="inline"
              icon="history"
              title={t('screens.activity.unavailable')}
              action={
                <Button size="sm" variant="outline" onPress={() => void feed.reload()}>
                  <Text>{t('common.retry')}</Text>
                </Button>
              }
            />
          ) : feed.status === 'ready' && feed.rows.length === 0 ? (
            <EmptyState
              variant="inline"
              icon="history"
              title={t('screens.activity.empty')}
              hint={t('screens.activity.empty-hint')}
            />
          ) : (
            <InfiniteList
              data={feed.rows}
              keyOf={activityKey}
              renderItem={render}
              estimatedItemSize={ROW_ESTIMATE}
              paging={feed.paging}
              gap={2}
              scrollIndicator
            />
          )}
        </Panel>
      </View>
    </AppScreen>
  );
}
