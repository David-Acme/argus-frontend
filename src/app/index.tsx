import { useAuthStore, useOnboardingStore } from '@/core/stores';
import { authService } from '@/core/services/auth.service';
import { sessionService } from '@/core/services/session.service';
import type { IAuthUser } from '@/core/interfaces';
import {
  ActivityCard,
  AgendaItem,
  CameraGrid,
  DashboardIconButton,
  DashboardSearchField,
  DashboardShell,
  NotificationPopover,
  ProjectCard,
  ScheduleTimeline,
  SectionHeading,
  SummaryCard,
} from '@/shared/components/dashboard';
import type { CalendarEntry, ScheduleEntry } from '@/core/types';
import { Button } from '@/shared/components/ui/button';
import { Text } from '@/shared/components/ui/text';
import { EntryActionsMenu } from '@/shared/components/calendar';
import { calendarEntryEditHref } from '@/shared/libs/calendar-entry-actions';
import { SectionPanel } from '@/shared/components/layout';
import { ServerUnreachable } from '@/shared/components/session/server-unreachable';
import { GuardCard } from '@/shared/components/security';
import { useDashboardData } from '@/shared/hooks/use-dashboard-data';
import { useGuardMode } from '@/shared/hooks/use-guard-mode';
import { useDateFormatter } from '@/shared/hooks/use-date-formatter';
import { usePermissions } from '@/shared/hooks/use-permissions';
import { useTranslation } from '@/shared/hooks/use-translation';
import { useWindowClass } from '@/shared/hooks/use-window-class';
import { itemIn, screenIn } from '@/shared/libs/animations';
import {
  initialDashboardDestination,
  type DashboardDestination,
} from '@/shared/libs/dashboard-route-state';
import { getDashboardSectionLayout } from '@/shared/libs/dashboard-section-layout';
import { IS_NATIVE, TODAY_PREVIEW_LIMIT } from '@/shared/constants';
import { Redirect, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ScrollView, View } from 'react-native';
import Animated from 'react-native-reanimated';

type DashboardScreenProps = {
  user: IAuthUser | null;
  voiceEnabled: boolean;
};

function firstNameOf(user: IAuthUser | null): string {
  return user?.name?.trim().split(/\s+/)[0] || 'usuario';
}

function DashboardScreen({ user, voiceEnabled }: DashboardScreenProps) {
  const router = useRouter();
  const { t } = useTranslation();
  const date = useDateFormatter();
  const { height, isShort, isWide, isExpanded, width } = useWindowClass();
  const { can, role } = usePermissions();
  const isOwner = role === 'owner';
  const guardMode = useGuardMode(isOwner);
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
  const sectionLayout = useMemo(() => getDashboardSectionLayout(width, height), [height, width]);

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

  const scheduleEntries = useMemo<ScheduleEntry[]>(
    () =>
      todayRows.map((entry) => ({
        id: entry.id,
        title: entry.title,
        time: formatTime(entry),
        hour: date.hourOf(new Date(entry.startsAt)),
        status: entry.status,
      })),
    [date, todayRows, formatTime]
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
      footer={
        isExpanded && !isShort ? (
          <Animated.View entering={itemIn.delay(300).duration(320)} className="gap-3">
            <SectionHeading
              title={t('screens.home.today-agenda')}
              action={t('screens.home.see-all')}
              onAction={() => router.push('/agenda')}
            />
            <ScheduleTimeline entries={scheduleEntries} onSelect={() => router.push('/agenda')} />
          </Animated.View>
        ) : null
      }
      aside={
        <Animated.View entering={itemIn.delay(200).duration(320)} className="flex-1 gap-5">
          <View className="min-h-0 flex-1 gap-3">
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
              fill={isWide}
              minHeight={sectionLayout.cameraMinHeight}
              onSelect={(id) => router.push(`/cameras/${id}`)}
            />
          </View>

          {isOwner ? <GuardCard state={guardMode} onPress={() => router.push('/security')} /> : null}

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
        </Animated.View>
      }>
      <Animated.View entering={screenIn} className="gap-5">
        <View className="flex-row items-center justify-between gap-4">
          <Text
            className={
              isShort
                ? 'flex-1 text-[22px] leading-7 font-bold tracking-tight'
                : 'flex-1 text-[28px] leading-8 font-bold tracking-tight'
            }
            numberOfLines={2}>
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
            />
            <DashboardIconButton
              icon="calendar"
              label={t('screens.home.calendar')}
              onPress={() => router.push('/agenda')}
            />
          </View>
        </View>

        <Animated.View entering={itemIn.delay(60).duration(300)}>
          <DashboardSearchField
            placeholder={t('screens.home.search-placeholder')}
            filterLabel={t('screens.home.see-all')}
            value={query}
            onChangeText={setQuery}
          />
        </Animated.View>

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

        <View className={isWide ? 'flex-row items-stretch gap-5' : 'gap-5'}>
          <Animated.View
            entering={itemIn.delay(160).duration(320)}
            className={isWide ? 'min-w-0 flex-1 gap-3' : 'gap-3'}>
            <SectionHeading
              title={t('screens.home.projects')}
              action={projects.length > 0 ? t('screens.home.see-all') : undefined}
              onAction={() => router.push('/projects')}
            />
            <SectionPanel
              isEmpty={visibleProjects.length === 0}
              icon="list-todo"
              emptyTitle={t('screens.projects.empty')}
              emptyHint={t('screens.projects.empty-hint')}
              emptyAction={
                can('project', 'create') ? (
                  <Button size="sm" onPress={() => router.push('/projects?new=project')}>
                    <Text>{t('screens.projects.new-project')}</Text>
                  </Button>
                ) : undefined
              }
              fill={sectionLayout.fill}
              minHeight={sectionLayout.minHeight}>
              <ScrollView
                horizontal
                nestedScrollEnabled
                showsHorizontalScrollIndicator={false}
                contentContainerClassName="gap-3 pr-2">
                {visibleProjects.map((project) => (
                  <ProjectCard
                    key={project.id}
                    title={project.name}
                    description={
                      project.description ||
                      t('screens.home.project-tasks', {
                        done: String(project.done),
                        total: String(project.total),
                      })
                    }
                    done={project.done}
                    total={project.total}
                    tasksLabel={t('screens.home.project-tasks-label')}
                    progressLabel={`${Math.round(project.progress * 100)}%`}
                    onPress={() => router.push(`/projects?id=${project.id}`)}
                  />
                ))}
              </ScrollView>
            </SectionPanel>
          </Animated.View>

          <Animated.View
            entering={itemIn.delay(240).duration(320)}
            className={isWide ? 'min-w-0 flex-1 gap-3' : 'gap-3'}>
            <SectionHeading
              title={t('screens.home.today-tasks')}
              action={t('screens.home.see-all')}
              onAction={() => router.push('/agenda')}
            />
            <SectionPanel
              isEmpty={todayRows.length === 0}
              icon="calendar"
              emptyTitle={t('screens.home.empty-agenda')}
              emptyHint={t('screens.home.empty-agenda-hint')}
              emptyAction={
                can('calendar_event', 'create') ? (
                  <Button size="sm" onPress={() => router.push('/agenda?new=event')}>
                    <Text>{t('screens.agenda.new-event')}</Text>
                  </Button>
                ) : undefined
              }
              fill={sectionLayout.fill}
              minHeight={sectionLayout.minHeight}
              className="gap-2.5">
              {todayRows.slice(0, TODAY_PREVIEW_LIMIT).map((entry) => (
                <AgendaItem
                  key={entry.id}
                  title={entry.title}
                  time={formatTime(entry)}
                  status={entry.status}
                  onPress={() => router.push('/agenda')}
                  actions={renderActions(entry)}
                />
              ))}
            </SectionPanel>
          </Animated.View>
        </View>
      </Animated.View>
    </DashboardShell>
  );
}

export default function IndexScreen() {
  const authStatus = useAuthStore((s) => s.status);
  const user = useAuthStore((s) => s.user);
  const voiceEnabled = useOnboardingStore((s) => s.voiceEnabled);
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

  return <DashboardScreen user={user} voiceEnabled={voiceEnabled} />;
}
