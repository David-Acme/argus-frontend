import { useAuthStore } from '@/core/stores';
import { authService } from '@/core/services/auth.service';
import { sessionService } from '@/core/services/session.service';
import { notificationService } from '@/core/services/notification.service';
import { toastServiceError } from '@/shared/libs/service-error';
import type { IAuthUser } from '@/core/interfaces';
import {
  ActivityCard,
  CameraGrid,
  DashboardIconButton,
  DashboardSearchField,
  DashboardShell,
  NotificationPopover,
  ProjectGrid,
  RecentActivityCard,
  SectionHeading,
  SummaryCard,
  TodayAgenda,
} from '@/shared/components/dashboard';
import type { CalendarEntry } from '@/core/types';
import { Button } from '@/shared/components/ui/button';
import { Text } from '@/shared/components/ui/text';
import { EntryActionsMenu } from '@/shared/components/calendar';
import { calendarEntryEditHref } from '@/shared/libs/calendar-entry-actions';
import { EmptyState } from '@/shared/components/layout';
import { ServerUnreachable } from '@/shared/components/session/server-unreachable';
import { GuardCard } from '@/shared/components/security';
import { useDashboardData } from '@/shared/hooks/use-dashboard-data';
import { useGuardMode } from '@/shared/hooks/use-guard';
import { guardAccessForRole } from '@/shared/libs/role-access';
import { useDateFormatter } from '@/shared/hooks/use-date-formatter';
import { useNow } from '@/shared/hooks/use-now';
import { usePermissions } from '@/shared/hooks/use-permissions';
import { useTranslation } from '@/shared/hooks/use-translation';
import { useWindowClass } from '@/shared/hooks/use-window-class';
import {
  initialDashboardDestination,
  type DashboardDestination,
} from '@/shared/libs/dashboard-route-state';
import { IS_NATIVE } from '@/shared/constants';
import { Redirect, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { View } from 'react-native';

type DashboardScreenProps = {
  user: IAuthUser | null;
};

function firstNameOf(user: IAuthUser | null): string {
  return user?.name?.trim().split(/\s+/)[0] || 'usuario';
}

function DashboardScreen({ user }: DashboardScreenProps) {
  const router = useRouter();
  const { t } = useTranslation();
  const date = useDateFormatter();
  const { isShort } = useWindowClass();
  const { can, role } = usePermissions();
  const markNotificationsRead = useCallback((ids: readonly string[]) => {
    void notificationService.markRead(ids).then((result) => {
      if (!result.ok) toastServiceError(result.errors);
    });
  }, []);
  const guardAccess = guardAccessForRole(role);
  const guardMode = useGuardMode(guardAccess.view).data;
  const {
    cameraTiles,
    projects,
    today,
    notifications,
    unreadNotifications,
    summary,
    activityLevels,
  } = useDashboardData();
  const [query, setQuery] = useState('');
  const now = useNow(60000);

  const matches = useCallback(
    (text: string) =>
      query.trim().length === 0 || text.toLowerCase().includes(query.trim().toLowerCase()),
    [query]
  );

  const todayRows = useMemo(() => today.filter((entry) => matches(entry.title)), [today, matches]);
  const visibleProjects = useMemo(
    () => projects.filter((project) => matches(project.name)),
    [projects, matches]
  );

  const formatTime = useCallback(
    (entry: CalendarEntry) =>
      entry.isAllDay
        ? t('screens.agenda.event-all-day')
        : date.formatTimeRange(
            new Date(entry.startsAt),
            entry.endsAt ? new Date(entry.endsAt) : null
          ),
    [date, t]
  );

  const trend = useMemo(() => {
    const { eventsCurrent, eventsPrevious } = summary;
    if (eventsCurrent === eventsPrevious)
      return { label: String(eventsCurrent), direction: 'flat' as const };
    if (eventsPrevious === 0) {
      return { label: `+${eventsCurrent}`, direction: 'up' as const };
    }
    const change = ((eventsCurrent - eventsPrevious) / eventsPrevious) * 100;
    return {
      label: `${change > 0 ? '+' : ''}${change.toFixed(1)}%`,
      direction: change >= 0 ? ('up' as const) : ('down' as const),
    };
  }, [summary]);

  const noCameras = summary.camerasTotal === 0;

  const renderActions = useCallback(
    (entry: CalendarEntry) => (
      <EntryActionsMenu
        entry={entry}
        canEdit={can(entry.source === 'task' ? 'project_task' : 'calendar_event', 'update')}
        canDelete={can(entry.source === 'task' ? 'project_task' : 'calendar_event', 'delete')}
        onEdit={(selected) => {
          const href = calendarEntryEditHref(selected);
          if (href) router.push(href);
        }}
      />
    ),
    [can, router]
  );

  return (
    <DashboardShell
      active="home"
      aside={
        <View className="flex-1 gap-5">
          <View className="gap-3">
            <SectionHeading
              title={t('screens.home.cameras_section')}
              action={t('screens.home.cameras-online', {
                online: String(summary.camerasOnline),
                total: String(summary.camerasTotal),
              })}
              onAction={() => router.push('/cameras')}
            />
            <CameraGrid
              cameras={cameraTiles}
              emptyLabel={t('screens.home.cameras-empty')}
              onSelect={(id) => router.push(`/cameras/${id}`)}
            />
          </View>

          {guardAccess.view ? <GuardCard state={guardMode} onPress={() => router.push('/security')} /> : null}

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
      }>
      <View className="gap-5">
        <View className="flex-row items-center justify-between gap-4">
          <Text variant={isShort ? 'headline' : 'display'} className="flex-1" numberOfLines={2}>
            {t('screens.home.welcome', { name: firstNameOf(user) })}
          </Text>
          <View className="flex-row gap-2">
            <NotificationPopover
              label={t('screens.home.notifications')}
              title={t('screens.home.notifications')}
              summary={
                unreadNotifications > 0
                  ? t('screens.home.notifications-unread', { count: String(unreadNotifications) })
                  : t('screens.home.notifications-read')
              }
              emptyLabel={t('screens.home.notifications-empty')}
              unreadCount={unreadNotifications}
              items={notifications}
              onSeen={markNotificationsRead}
            />
            <DashboardIconButton
              icon="calendar"
              label={t('screens.home.calendar')}
              onPress={() => router.push('/agenda')}
            />
          </View>
        </View>

        <DashboardSearchField
          placeholder={t('screens.home.search-placeholder')}
          filterLabel={t('screens.home.see-all')}
          value={query}
          onChangeText={setQuery}
        />

        <ActivityCard
          title={
            noCameras
              ? t('screens.home.activity-no-cameras')
              : t('screens.home.activity-events', { count: String(summary.eventsCurrent) })
          }
          delta={trend.label}
          direction={trend.direction}
          levels={activityLevels}
          action={noCameras ? t('screens.cameras.connect') : t('screens.home.activity-action')}
          onAction={() => router.push(noCameras ? '/cameras?new=camera' : '/cameras')}
        />

        <View className="gap-3">
          <SectionHeading
            title={t('screens.home.today')}
            action={t('screens.home.see-all')}
            onAction={() => router.push('/agenda')}
          />
          <TodayAgenda
            entries={todayRows}
            now={now}
            formatTime={formatTime}
            renderActions={renderActions}
            onSelect={(entry) => {
              const href = calendarEntryEditHref(entry);
              router.push(href ?? '/agenda');
            }}
            onCreateAt={
              can('calendar_event', 'create')
                ? (at) => router.push(`/agenda?new=event&at=${at}`)
                : undefined
            }
          />
        </View>

        <View className="gap-3">
          <SectionHeading
            title={t('screens.home.projects')}
            action={projects.length > 0 ? t('screens.home.see-all') : undefined}
            onAction={() => router.push('/projects')}
          />
          {visibleProjects.length === 0 ? (
            <EmptyState
              fill={false}
              className="bg-card rounded-3xl py-8"
              icon="list-todo"
              title={t('screens.projects.empty')}
              hint={t('screens.projects.empty-hint')}
              action={
                can('project', 'create') ? (
                  <Button size="sm" onPress={() => router.push('/projects?new=project')}>
                    <Text>{t('screens.projects.new-project')}</Text>
                  </Button>
                ) : undefined
              }
            />
          ) : (
            <ProjectGrid
              projects={visibleProjects}
              onSelect={(id) => router.push(`/projects?id=${id}`)}
              createLabel={t('screens.projects.new-project')}
              onCreate={can('project', 'create') ? () => router.push('/projects?new=project') : undefined}
            />
          )}
        </View>
      </View>
    </DashboardShell>
  );
}

export default function IndexScreen() {
  const authStatus = useAuthStore((s) => s.status);
  const user = useAuthStore((s) => s.user);
  const [destination, setDestination] = useState<DashboardDestination>(() =>
    initialDashboardDestination(authStatus)
  );

  const resolveDestination = useCallback(async (): Promise<DashboardDestination | null> => {
    if (authStatus === 'signed-in') return 'home';
    if (authStatus !== 'signed-out') return null;
    const pairing = await sessionService.getPairingState();
    if (!pairing.paired) return 'welcome';
    if (!IS_NATIVE) return 'login';
    const res = await authService.serverStatus();
    if (!res.ok || !res.info) return 'unreachable';
    return res.info.hasOwner ? 'login' : 'owner-enroll';
  }, [authStatus]);

  const retryDestination = useCallback(() => {
    setDestination('loading');
    void resolveDestination().then((next) => {
      if (next) setDestination(next);
    });
  }, [resolveDestination]);

  useEffect(() => {
    let active = true;
    void resolveDestination().then((next) => {
      if (active && next) setDestination(next);
    });
    return () => {
      active = false;
    };
  }, [resolveDestination]);

  if (destination === 'loading' || authStatus === 'loading') {
    return <View className="bg-background flex-1" />;
  }

  if (destination === 'unreachable') return <ServerUnreachable onRetry={retryDestination} />;
  if (destination === 'welcome') return <Redirect href="/welcome" />;
  if (destination === 'owner-enroll') return <Redirect href="/welcome/face?mode=owner-enroll" />;
  if (destination === 'login') {
    return IS_NATIVE ? <Redirect href="/welcome/face?mode=login" /> : <Redirect href="/login" />;
  }

  return <DashboardScreen user={user} />;
}
