import { useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { ScrollView, View } from 'react-native';
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

  const filters = (
    <View className="pb-3">
      <ActivityFilters filter={filter} modules={modules} people={people} onChange={setFilter} />
    </View>
  );

  return (
    <AppScreen
      bottomNav={false}
      scrollable={false}
      header={<ScreenHeader title={t('screens.activity.title')} subtitle={t('screens.activity.subtitle')} onBack={back} />}>
      {feed.rows.length === 0 ? (
        <ScrollView className="min-h-0 flex-1" contentContainerClassName="pb-6" showsVerticalScrollIndicator={false}>
          {filters}
          {feed.status === 'loading' ? (
            <Panel className="gap-2 p-3">
              <ActivitySkeleton />
              <ActivitySkeleton />
              <ActivitySkeleton />
            </Panel>
          ) : (
            <Panel className="py-4">
              {feed.status === 'failed' ? (
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
              ) : (
                <EmptyState
                  variant="inline"
                  icon="history"
                  title={t('screens.activity.empty')}
                  hint={t('screens.activity.empty-hint')}
                />
              )}
            </Panel>
          )}
        </ScrollView>
      ) : (
        <View className="min-h-0 flex-1">
          <InfiniteList
            data={feed.rows}
            keyOf={activityKey}
            renderItem={render}
            estimatedItemSize={ROW_ESTIMATE}
            paging={feed.paging}
            header={filters}
            gap={2}
            scrollIndicator
          />
        </View>
      )}
    </AppScreen>
  );
}

function ActivitySkeleton() {
  return (
    <View className="flex-row items-center gap-3 px-3 py-2">
      <View className="bg-surface-secondary size-10 rounded-full" />
      <View className="flex-1 gap-2">
        <View className="bg-surface-secondary h-3 w-3/4 rounded-full" />
        <View className="bg-surface-secondary h-2.5 w-1/3 rounded-full opacity-70" />
      </View>
    </View>
  );
}
