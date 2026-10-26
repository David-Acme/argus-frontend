import { useRouter } from 'expo-router';
import { useState } from 'react';
import type { ReactNode } from 'react';
import type { IPeopleDirectoryCacheRow } from '@/core/interfaces';
import type { ActivityFilter } from '@/core/types';
import { CAPABILITY, VIEW_CACHE_KEYS } from '@/shared/constants';
import { useViewCacheRows } from '@/shared/hooks/use-cached-rows';
import { useCapabilities } from '@/shared/hooks/use-capabilities';
import { useDateFormatter } from '@/shared/hooks/use-date-formatter';
import { useTranslation } from '@/shared/hooks/use-translation';
import { Avatar } from '@/shared/ui/avatar';
import { SkeletonRow } from '@/shared/ui/resource-view';
import { Row } from '@/shared/ui/row';
import { Section } from '@/shared/ui/section';
import { useModuleCatalog } from '@/features/modules';
import {
  ACTIVITY_HREF,
  RECENT_SHOWN,
  activityGlyph,
} from '@/features/activity/constants/activity-look.constant';
import { useActivityFeed } from '@/features/activity/hooks/use-activity-feed';
import { EMPTY_ACTIVITY_FILTER } from '@/features/activity/model/activity-filter';
import { describeActivity } from '@/features/activity/model/activity-text';

type RecentActivitySectionProps = { userId: number; fallback: ReactNode };

const fullName = (user: IPeopleDirectoryCacheRow) =>
  [user.name, user.lastName].filter(Boolean).join(' ');

export function RecentActivitySection({ userId, fallback }: RecentActivitySectionProps) {
  const { t } = useTranslation();
  const router = useRouter();
  const { formatDayMonth, formatTime } = useDateFormatter();
  const { has } = useCapabilities();
  const allowed = has(CAPABILITY.activityRead);
  const [filter] = useState<ActivityFilter>(() => ({ ...EMPTY_ACTIVITY_FILTER, userId }));
  const feed = useActivityFeed(filter, allowed);
  const users = useViewCacheRows<IPeopleDirectoryCacheRow>(VIEW_CACHE_KEYS.peopleUsers);
  const catalog = useModuleCatalog();
  const names = new Map(users.map((user) => [Number(user.id), fullName(user)]));
  const moduleName = (id: string) =>
    catalog?.modules.find((module) => module.id === id)?.name || t('screens.modules.core-name');
  const rows = feed.rows.slice(0, RECENT_SHOWN);
  if (!allowed || (feed.status === 'ready' && rows.length === 0)) return <>{fallback}</>;
  if (feed.status === 'failed' && rows.length === 0)
    return (
      <Section title={t('screens.activity.recent.title')}>
        <Row
          leading={<Avatar icon="refresh" tone="attn" />}
          title={t('screens.activity.unavailable')}
          meta={t('common.retry')}
          onPress={() => void feed.reload()}
        />
      </Section>
    );
  return (
    <Section
      title={t('screens.activity.recent.title')}
      action={{
        label: t('screens.activity.recent.all'),
        onPress: () => router.push(ACTIVITY_HREF),
      }}>
      {rows.length === 0 ? (
        <SkeletonRow />
      ) : (
        rows.map((item) => {
          const at = new Date(item.createdAt * 1000);
          return (
            <Row
              key={item.id}
              leading={<Avatar icon={activityGlyph(item.table)} />}
              title={describeActivity(item, { names, moduleName, t }).title}
              meta={`${formatDayMonth(at)} · ${formatTime(at)}`}
            />
          );
        })
      )}
    </Section>
  );
}
