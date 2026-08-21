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
} from '@/shared/components/dashboard';
import type { CalendarEntry, DashboardTab, ScheduleEntry } from '@/core/types';
import { Button } from '@/shared/components/ui/button';
import { Text } from '@/shared/components/ui/text';
import { EntryActionsMenu } from '@/shared/components/calendar';
import { EmptyState } from '@/shared/components/layout';
import { useDashboardData } from '@/shared/hooks/use-dashboard-data';
import { usePermissions } from '@/shared/hooks/use-permissions';
import { useTranslation } from '@/shared/hooks/use-translation';
import { useWindowClass } from '@/shared/hooks/use-window-class';
import { itemIn, screenIn } from '@/shared/libs/animations';
import { DASHBOARD_TAB_ROUTE, IS_NATIVE, TODAY_PREVIEW_LIMIT } from '@/shared/constants';
import { Redirect, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ScrollView, View } from 'react-native';
import Animated from 'react-native-reanimated';

type Destination = 'loading' | 'welcome' | 'owner-enroll' | 'login' | 'home';

type DashboardScreenProps = {
  user: IAuthUser | null;
  voiceEnabled: boolean;
};

function firstNameOf(user: IAuthUser | null): string {
  return user?.name?.trim().split(/\s+/)[0] || 'usuario';
}

function DashboardScreen({ user, voiceEnabled }: DashboardScreenProps) {
  const router = useRouter();
  const { t, language } = useTranslation();
  const { isShort, isWide, isExpanded } = useWindowClass();
  const { can } = usePermissions();
  const {
    cameraTiles,
    projects,
    today,
    notifications,
    unreadNotifications,
    summary,
    activityLevels,
  } = useDashboardData(user?.id ?? null);
  const locale = language === 'es' ? 'es-PE' : 'en-US';
  const [query, setQuery] = useState('');

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
        : new Intl.DateTimeFormat(locale, { hour: 'numeric', minute: '2-digit' }).format(
            new Date(entry.startsAt)
          ),
    [locale, t]
  );

  const scheduleEntries = useMemo<ScheduleEntry[]>(
    () =>
      todayRows.map((entry) => ({
        id: entry.id,
        title: entry.title,
        time: formatTime(entry),
        hour: new Date(entry.startsAt).getHours(),
        status: entry.status,
        members: [],
      })),
    [todayRows, formatTime]
  );

  const trend = useMemo(() => {
    const { eventsCurrent, eventsPrevious } = summary;
    if (eventsCurrent === eventsPrevious) return { label: String(eventsCurrent), direction: 'flat' as const };
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

  const goToTab = useCallback(
    (tab: DashboardTab) => router.replace(DASHBOARD_TAB_ROUTE[tab]),
    [router]
  );

  const handleVoice = useCallback(() => router.push('/welcome/voice'), [router]);

  const renderActions = useCallback(
    (entry: CalendarEntry) => (
      <EntryActionsMenu
        entry={entry}
        canEdit={can(entry.source === 'task' ? 'project_task' : 'calendar_event', 'update')}
        canDelete={can(entry.source === 'task' ? 'project_task' : 'calendar_event', 'delete')}
        onEdit={() => router.push('/agenda?new=event')}
      />
    ),
    [can, router]
  );

  return (
    <DashboardShell
      active="home"
      labels={{
        home: t('screens.home.home'),
        schedule: t('screens.agenda.schedule'),
        projects: t('screens.projects.title'),
        profile: t('screens.home.profile'),
      }}
      composeLabel={voiceEnabled && IS_NATIVE ? t('screens.home.talk') : t('screens.home.compose')}
      onNavigate={goToTab}
      onCompose={handleVoice}
      aside={
        <Animated.View entering={itemIn.delay(200).duration(320)} className="flex-1 gap-5">
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

        <View className={isWide ? 'flex-row items-start gap-5' : 'gap-5'}>
          <Animated.View
            entering={itemIn.delay(160).duration(320)}
            className={isWide ? 'min-w-0 flex-1 gap-3' : 'gap-3'}>
            <SectionHeading
              title={t('screens.home.projects')}
              action={projects.length > 0 ? t('screens.home.see-all') : undefined}
              onAction={() => router.push('/projects')}
            />
            {visibleProjects.length > 0 ? (
              <ScrollView
                horizontal
                nestedScrollEnabled
                showsHorizontalScrollIndicator={false}
                contentContainerClassName="gap-3 pr-2">
                {visibleProjects.map((project, index) => (
                  <ProjectCard
                    key={project.id}
                    icon="list-todo"
                    visual={index % 2 === 0 ? 'chart' : 'tiles'}
                    title={project.name}
                    description={
                      project.description ||
                      t('screens.home.project-tasks', {
                        done: String(project.done),
                        total: String(project.total),
                      })
                    }
                    progress={project.progress}
                    meta={`${Math.round(project.progress * 100)}%`}
                    onPress={() => router.push('/projects')}
                  />
                ))}
              </ScrollView>
            ) : (
              <EmptyState
                icon="list-todo"
                title={t('screens.projects.empty')}
                hint={t('screens.projects.empty-hint')}
                fill={false}
                action={
                  can('project', 'create') ? (
                    <Button size="sm" onPress={() => router.push('/projects?new=project')}>
                      <Text>{t('screens.projects.new-project')}</Text>
                    </Button>
                  ) : undefined
                }
              />
            )}
          </Animated.View>

          <Animated.View
            entering={itemIn.delay(240).duration(320)}
            className={isWide ? 'min-w-0 flex-1 gap-3' : 'gap-3'}>
            <SectionHeading
              title={t('screens.home.today-tasks')}
              action={t('screens.home.see-all')}
              onAction={() => router.push('/agenda')}
            />
            <View className="gap-2.5">
              {todayRows.length > 0 ? (
                todayRows
                  .slice(0, TODAY_PREVIEW_LIMIT)
                  .map((entry) => (
                    <AgendaItem
                      key={entry.id}
                      title={entry.title}
                      time={formatTime(entry)}
                      status={entry.status}
                      onPress={() => router.push('/agenda')}
                      actions={renderActions(entry)}
                    />
                  ))
              ) : (
                <EmptyState
                  icon="calendar"
                  title={t('screens.home.empty-agenda')}
                  hint={t('screens.home.empty-agenda-hint')}
                  fill={false}
                  action={
                    can('calendar_event', 'create') ? (
                      <Button size="sm" onPress={() => router.push('/agenda?new=event')}>
                        <Text>{t('screens.agenda.new-event')}</Text>
                      </Button>
                    ) : undefined
                  }
                />
              )}
            </View>
          </Animated.View>
        </View>

        {isExpanded && !isShort ? (
          <Animated.View entering={itemIn.delay(300).duration(320)} className="gap-3">
            <SectionHeading
              title={t('screens.home.today-agenda')}
              action={t('screens.home.see-all')}
              onAction={() => router.push('/agenda')}
            />
            <ScheduleTimeline
              entries={scheduleEntries}
              formatHour={(hour) =>
                new Intl.DateTimeFormat(locale, { hour: 'numeric' }).format(
                  new Date(2026, 0, 1, hour)
                )
              }
              onSelect={() => router.push('/agenda')}
            />
          </Animated.View>
        ) : null}
      </Animated.View>
    </DashboardShell>
  );
}

export default function IndexScreen() {
  const authStatus = useAuthStore((s) => s.status);
  const user = useAuthStore((s) => s.user);
  const voiceEnabled = useOnboardingStore((s) => s.voiceEnabled);
  const [destination, setDestination] = useState<Destination>('loading');

  const resolveDestination = useCallback(async (): Promise<Destination | null> => {
    if (authStatus === 'signed-in') return 'home';
    if (authStatus !== 'signed-out') return null;
    const pairing = await sessionService.getPairingState();
    if (!pairing.paired) return 'welcome';
    const res = await authService.hasAdmin();
    const hasAdmin = res.ok && res.info?.hasAdmin === true;
    if (!IS_NATIVE) return 'login';
    return hasAdmin ? 'login' : 'owner-enroll';
  }, [authStatus]);

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

  if (destination === 'welcome') return <Redirect href="/welcome" />;
  if (destination === 'owner-enroll') return <Redirect href="/welcome/face?mode=owner-enroll" />;
  if (destination === 'login') {
    return IS_NATIVE ? <Redirect href="/welcome/face?mode=login" /> : <Redirect href="/login" />;
  }

  return <DashboardScreen user={user} voiceEnabled={voiceEnabled} />;
}
