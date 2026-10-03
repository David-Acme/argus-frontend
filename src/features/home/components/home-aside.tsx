import { useRouter } from 'expo-router';
import { View } from 'react-native';
import type { ICameraCacheRow, INotificationPreviewCacheRow } from '@/core/interfaces';
import type { DashboardSummary } from '@/core/types';
import { SectionHeader } from '@/shared/components/ui/section-header';
import { usePermissions } from '@/shared/hooks/use-permissions';
import { useTranslation } from '@/shared/hooks/use-translation';
import { guardAccessForRole } from '@/shared/libs/role-access';
import { GuardCard, useGuardMode } from '@/features/security';
import { CameraGrid } from '@/features/home/components/camera-grid';
import { RecentActivityCard } from '@/features/home/components/recent-activity-card';
import { SummaryCard } from '@/features/home/components/summary-card';

type HomeAsideProps = {
  cameras: readonly ICameraCacheRow[];
  summary: DashboardSummary;
  notifications: readonly INotificationPreviewCacheRow[];
};

export function HomeAside({ cameras, summary, notifications }: HomeAsideProps) {
  const router = useRouter();
  const { t } = useTranslation();
  const { role } = usePermissions();
  const guardAccess = guardAccessForRole(role);
  const guardMode = useGuardMode(guardAccess.view).data;

  return (
    <View className="flex-1 gap-5">
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

      {guardAccess.view ? (
        <GuardCard state={guardMode} onPress={() => router.push('/security')} />
      ) : null}

      <SummaryCard
        title={t('screens.home.overview')}
        items={[
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
        ]}
      />

      <RecentActivityCard
        title={t('screens.home.recent')}
        emptyLabel={t('screens.home.notifications-empty')}
        items={notifications}
      />
    </View>
  );
}
