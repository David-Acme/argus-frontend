import { useAuthStore } from '@/core/stores';
import { notificationService } from '@/core/services/notification.service';
import { runOptimistic } from '@/shared/libs/optimistic-action';
import type { IAuthUser } from '@/core/interfaces';
import { ActivityCard } from '@/features/home/components/activity/activity-card';
import { IconButton } from '@/shared/components/ui/icon-button';
import { DashboardSearchField } from '@/features/home/components/dashboard-search-field';
import { NotificationPopover } from '@/features/home/components/notification-popover';
import { ProjectGrid } from '@/features/home/components/project-grid';
import { TodayAgenda } from '@/features/home/components/today-agenda';
import { SectionHeader } from '@/shared/components/ui/section-header';
import type { CalendarEntry } from '@/core/types';
import { Button } from '@/shared/components/ui/button';
import { Text } from '@/shared/components/ui/text';
import {
  byStart,
  CALENDAR_LENSES,
  calendarEntryEditHref,
  EntryActionsMenu,
  entryPermissions,
} from '@/features/agenda';
import { useNotificationFeed } from '@/features/home/hooks/use-notification-feed';
import {
  unreadIdsOf,
  unreadThreadCount,
  type NotificationThread,
} from '@/features/home/model/notification-threads';
import { activityTrend } from '@/features/home/model/activity-trend';
import { HomeAside } from '@/features/home/components/home-aside';
import { EmptyState } from '@/shared/components/ui/empty-state';
import { ResponseStrip } from '@/features/response';
import { GettingStartedCard, ModulesProgressChip } from '@/features/modules';
import { CAPABILITY } from '@/shared/constants';
import { AppScreen } from '@/shared/components/layout';
import { useDashboardData } from '@/features/home/hooks/use-dashboard-data';
import { useOptimisticRows } from '@/shared/hooks/use-optimistic-rows';
import { useDateFormatter } from '@/shared/hooks/use-date-formatter';
import { useNow } from '@/shared/hooks/use-now';
import { useCapabilities } from '@/shared/hooks/use-capabilities';
import { useTranslation } from '@/shared/hooks/use-translation';
import { useWindowClass } from '@/shared/hooks/use-window-class';
import { useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { View } from 'react-native';

function firstNameOf(user: IAuthUser | null): string {
  return user?.name?.trim().split(/\s+/)[0] ?? '';
}

export default function HomeScreen() {
  const user = useAuthStore((state) => state.user);
  const router = useRouter();
  const { t, language } = useTranslation();
  const date = useDateFormatter();
  const { isShort } = useWindowClass();
  const { can, has, guard } = useCapabilities();
  const {
    cameraTiles,
    projects,
    today,
    unreadNotifications: syncedUnread,
    summary,
    activityLevels,
  } = useDashboardData();
  const watchesCameras = has(CAPABILITY.cameraView);
  const readsAgenda = has(CAPABILITY.agendaRead);
  const readsProjects = can('project', 'read');
  const [query, setQuery] = useState('');
  const now = useNow(60000);
  const { rows: todayEntries } = useOptimisticRows(today, CALENDAR_LENSES, byStart);
  const {
    synced: syncedNotifications,
    threads,
    paging: notificationPaging,
  } = useNotificationFeed();
  const unreadNotifications = unreadThreadCount(threads, syncedUnread, syncedNotifications);
  const firstName = firstNameOf(user);

  const matches = useCallback(
    (text: string) =>
      query.trim().length === 0 || text.toLowerCase().includes(query.trim().toLowerCase()),
    [query]
  );

  const todayRows = useMemo(
    () =>
      todayEntries.filter((entry) => date.sameDay(new Date(entry.startsAt), new Date(now)) && matches(entry.title)),
    [date, matches, now, todayEntries]
  );
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

  const trend = useMemo(() => activityTrend(summary, language), [language, summary]);

  const noCameras = summary.camerasTotal === 0;

  const markNotificationsRead = useCallback((ids: readonly string[]) => {
    void runOptimistic({
      intents: ids.map((id) => ({ table: 'notification', kind: 'update', recordId: id, values: { isRead: true } })),
      call: () => notificationService.markRead(ids),
    });
  }, []);

  const readAll = useCallback(async () => {
    const synced = user ? await notificationService.unreadIdsForUser(String(user.id)) : [];
    const ids = [...new Set([...synced, ...unreadIdsOf(threads)])];
    if (ids.length > 0) markNotificationsRead(ids);
  }, [markNotificationsRead, threads, user]);

  const readThread = useCallback(
    (thread: NotificationThread) => markNotificationsRead(thread.unreadIds),
    [markNotificationsRead]
  );

  const renderActions = useCallback(
    (entry: CalendarEntry) => (
      <EntryActionsMenu
        entry={entry}
        {...entryPermissions(entry, can)}
        onEdit={(selected) => {
          const href = calendarEntryEditHref(selected);
          if (href) router.push(href);
        }}
      />
    ),
    [can, router]
  );

  return (
    <AppScreen
      aside={
        <HomeAside
          cameras={cameraTiles}
          summary={summary}
          threads={threads}
          paging={notificationPaging}
          now={now}
          onReadThread={readThread}
        />
      }>
      <View className="gap-5">
        <View className="flex-row items-center justify-between gap-4">
          <Text variant={isShort ? 'headline' : 'display'} className="flex-1" numberOfLines={2}>
            {firstName ? t('screens.home.welcome', { name: firstName }) : t('screens.home.welcome-anonymous')}
          </Text>
          <View className="flex-row gap-2">
            <NotificationPopover
              unreadCount={unreadNotifications}
              threads={threads}
              now={now}
              onOpen={() => void readAll()}
            />
            {readsAgenda ? (
              <IconButton
                icon="calendar"
                label={t('screens.home.calendar')}
                onPress={() => router.push('/agenda')}
              />
            ) : null}
          </View>
        </View>

        {guard.view ? <ResponseStrip /> : null}

        <ModulesProgressChip />

        <GettingStartedCard />

        <DashboardSearchField
          placeholder={t('screens.home.search-placeholder')}
          filterLabel={t('screens.home.see-all')}
          value={query}
          onChangeText={setQuery}
        />

        {watchesCameras ? (
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
        ) : null}

        {readsAgenda ? (
        <View className="gap-3">
          <SectionHeader
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
        ) : null}

        {readsProjects ? (
        <View className="gap-3">
          <SectionHeader
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
        ) : null}
      </View>
    </AppScreen>
  );
}
