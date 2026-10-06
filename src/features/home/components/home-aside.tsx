import { useRouter } from 'expo-router';
import { View } from 'react-native';
import type { ICameraCacheRow } from '@/core/interfaces';
import type { DashboardSummary } from '@/core/types';
import { SectionHeader } from '@/shared/components/ui/section-header';
import type { InfiniteListState } from '@/shared/hooks/use-infinite-list';
import { useCapabilities } from '@/shared/hooks/use-capabilities';
import { useTranslation } from '@/shared/hooks/use-translation';
import { useWindowClass } from '@/shared/hooks/use-window-class';
import { CAPABILITY } from '@/shared/constants';
import { GuardCard, useGuardEnvironments } from '@/features/security';
import { CameraGrid } from '@/features/home/components/camera-grid';
import { RecentActivityCard } from '@/features/home/components/recent-activity-card';
import { SummaryCard } from '@/features/home/components/summary-card';
import type { NotificationThread } from '@/features/home/model/notification-threads';

type HomeAsideProps = {
  cameras: readonly ICameraCacheRow[];
  summary: DashboardSummary;
  threads: readonly NotificationThread[];
  paging: InfiniteListState;
  now: number;
  onReadThread: (thread: NotificationThread) => void;
};

export function HomeAside({
  cameras,
  summary,
  threads,
  paging,
  now,
  onReadThread,
}: HomeAsideProps) {
  const router = useRouter();
  const { t } = useTranslation();
  const { has, can, guard } = useCapabilities();
  const { isWide } = useWindowClass();
  const watchesCameras = has(CAPABILITY.cameraView);
  const guardEnvironments = useGuardEnvironments(guard.view).data;

  return (
    <View className="flex-1 gap-5">
      {watchesCameras ? (
      <View className="gap-3">
        <SectionHeader
          title={t('screens.home.cameras_section')}
          action={t('screens.home.cameras-online', {
            online: String(summary.camerasOnline),
            total: String(summary.camerasTotal),
          })}
          onAction={() => router.push('/cameras')}
        />
        <CameraGrid
          cameras={cameras}
          emptyLabel={t('screens.home.cameras-empty')}
          onSelect={(id) => router.push(`/cameras/${id}`)}
        />
      </View>
      ) : null}

      {guard.view ? (
        <GuardCard environments={guardEnvironments} onPress={() => router.push('/security')} />
      ) : null}

      <SummaryCard
        title={t('screens.home.overview')}
        items={([
          {
            icon: 'video',
            label: t('screens.home.cameras'),
            value: `${summary.camerasOnline}/${summary.camerasTotal}`,
          },
          {
            icon: 'bell',
            label: t('screens.home.reminders'),
            value: String(summary.remindersPending),
          },
          {
            icon: 'list-todo',
            label: t('screens.home.tasks-open'),
            value: String(summary.tasksOpen),
          },
          {
            icon: 'activity',
            label: t('screens.home.events-week'),
            value: String(summary.eventsCurrent),
          },
        ] as const).filter(
          (item) =>
            ((item.icon !== 'video' && item.icon !== 'activity') || watchesCameras) &&
            (item.icon !== 'list-todo' || can('project_task', 'read')) &&
            (item.icon !== 'bell' || has(CAPABILITY.remindersRead))
        )}
      />

      <RecentActivityCard
        title={t('screens.home.recent')}
        emptyLabel={t('screens.home.notifications-empty')}
        threads={threads}
        paging={paging}
        fill={isWide}
        now={now}
        onRead={onReadThread}
      />
    </View>
  );
}
