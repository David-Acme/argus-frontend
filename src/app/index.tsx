import { useAuthStore, useOnboardingStore } from '@/core/stores';
import { authService } from '@/core/services/auth.service';
import { sessionService } from '@/core/services/session.service';
import type { IAuthUser } from '@/core/interfaces';
import {
  ActivityCard,
  AgendaItem,
  DashboardBottomNav,
  DashboardIconButton,
  DashboardSearchField,
  ProjectCard,
  SectionHeading,
} from '@/shared/components/dashboard';
import type { AgendaStatus, DashboardTab } from '@/core/types';
import { Icon } from '@/shared/components/ui/icon';
import { Text } from '@/shared/components/ui/text';
import { useDashboardData } from '@/shared/hooks/use-dashboard-data';
import { useTranslation } from '@/shared/hooks/use-translation';
import { itemIn, screenIn } from '@/shared/libs/animations';
import { DASHBOARD_MEMBERS, IS_NATIVE } from '@/shared/constants';
import { Redirect, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type Destination = 'loading' | 'welcome' | 'owner-enroll' | 'login' | 'home';

type DashboardScreenProps = {
  user: IAuthUser | null;
  voiceEnabled: boolean;
};

function firstNameOf(user: IAuthUser | null): string {
  return user?.name?.trim().split(/\s+/)[0] || 'usuario';
}

function formatTime(date: Date, locale: string): string {
  return new Intl.DateTimeFormat(locale, {
    hour: 'numeric',
    minute: '2-digit',
  }).format(date);
}

function isToday(date: Date): boolean {
  const now = new Date();
  return (
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate()
  );
}

function DashboardScreen({ user, voiceEnabled }: DashboardScreenProps) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { t, language } = useTranslation();
  const { cameras, reminders, unreadNotifications } = useDashboardData(user?.id ?? null);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const locale = language === 'es' ? 'es-PE' : 'en-US';
  const todayReminders = useMemo(
    () => reminders.filter((reminder) => isToday(reminder.scheduledAt)),
    [reminders],
  );
  const activeCameraCount = cameras.filter((camera) => camera.isEnabled && camera.isOnline).length;
  const pendingReminderCount = reminders.filter((reminder) => !reminder.isCompleted).length;
  const cameraProgress = cameras.length > 0 ? activeCameraCount / cameras.length : 0.3;
  const reminderProgress = reminders.length > 0 ? pendingReminderCount / reminders.length : 0.12;
  const previewItems = useMemo(
    () => [
      {
        title: t('screens.home.preview-task-1'),
        description: t('screens.home.preview-description-1'),
        time: '09:15',
        status: 'active' as AgendaStatus,
      },
      {
        title: t('screens.home.preview-task-2'),
        description: t('screens.home.preview-description-2'),
        time: '11:15',
        status: 'upcoming' as AgendaStatus,
      },
      {
        title: t('screens.home.preview-task-3'),
        description: t('screens.home.preview-description-3'),
        time: '14:00',
        status: 'upcoming' as AgendaStatus,
      },
    ],
    [t],
  );
  const agendaItems = todayReminders.length
    ? todayReminders.slice(0, 3).map((reminder) => ({
        title: reminder.title,
        description: reminder.description,
        time: formatTime(reminder.scheduledAt, locale),
        status: reminder.isCompleted ? ('complete' as AgendaStatus) : ('upcoming' as AgendaStatus),
      }))
    : previewItems;

  const goToTab = useCallback(
    (tab: DashboardTab) => {
      // Only home and the schedule exist today; the other two are template
      // slots and route to the schedule until they have screens of their own.
      if (tab === 'home') router.replace('/');
      else router.push('/agenda');
    },
    [router],
  );

  const handleVoice = useCallback(() => router.push('/welcome/voice'), [router]);

  return (
    <View className="bg-background flex-1">
      <ScrollView
        className="flex-1"
        contentContainerClassName="pb-40"
        showsVerticalScrollIndicator={false}>
        <Animated.View
          entering={screenIn}
          className="w-full max-w-3xl self-center gap-5 px-5"
          style={{ paddingTop: insets.top + 18 }}>
          <View className="flex-row items-center justify-between gap-4">
            <Text
              className="flex-1 text-[28px] font-bold leading-8 tracking-tight"
              numberOfLines={2}>
              {t('screens.home.welcome', { name: firstNameOf(user) })}
            </Text>
            <View className="flex-row gap-2">
              <DashboardIconButton
                icon="bell"
                label={t('screens.home.notifications')}
                badge={unreadNotifications}
                onPress={() => setNotificationsOpen((open) => !open)}
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
            />
          </Animated.View>

          <ActivityCard
            title={t('screens.home.activity-title')}
            delta={t('screens.home.activity-delta')}
            action={t('screens.home.activity-action')}
            onAction={() => router.push('/agenda')}
          />

          <Animated.View entering={itemIn.delay(160).duration(320)} className="gap-3">
            <SectionHeading title={t('screens.home.projects')} />
            <ScrollView
              horizontal
              nestedScrollEnabled
              showsHorizontalScrollIndicator={false}
              contentContainerClassName="gap-3 pr-2">
              <ProjectCard
                icon="video"
                visual="chart"
                title={t('screens.home.project-cameras')}
                description={t('screens.home.project-cameras-description')}
                progress={cameraProgress}
                meta={`${Math.round(cameraProgress * 100)}%`}
                onPress={() => router.push('/agenda')}
              />
              <ProjectCard
                icon="list-todo"
                visual="tiles"
                title={t('screens.home.project-reminders')}
                description={t('screens.home.project-reminders-description')}
                progress={reminderProgress}
                meta={`${Math.round(reminderProgress * 100)}%`}
                onPress={() => router.push('/agenda')}
              />
            </ScrollView>
          </Animated.View>

          <Animated.View entering={itemIn.delay(240).duration(320)} className="gap-3">
            <SectionHeading
              title={t('screens.home.today-tasks')}
              action={t('screens.home.see-all')}
              onAction={() => router.push('/agenda')}
            />
            <View className="gap-2.5">
              {agendaItems.slice(0, 3).map((item, index) => (
                <AgendaItem
                  key={`${item.title}-${index}`}
                  title={item.title}
                  members={DASHBOARD_MEMBERS[index % DASHBOARD_MEMBERS.length]}
                  time={item.time}
                  status={item.status}
                  onPress={() => router.push('/agenda')}
                />
              ))}
            </View>
            {todayReminders.length === 0 ? (
              <View className="flex-row items-center gap-2 px-1">
                <Icon name="activity" className="text-muted-foreground size-4" />
                <Text className="text-muted-foreground flex-1 text-xs">
                  {t('screens.home.preview-label')}
                </Text>
              </View>
            ) : null}
          </Animated.View>
        </Animated.View>
      </ScrollView>

      <DashboardBottomNav
        active="home"
        labels={{
          home: t('screens.home.home'),
          insights: t('screens.home.insights'),
          messages: t('screens.home.messages'),
          profile: t('screens.home.profile'),
        }}
        composeLabel={voiceEnabled && IS_NATIVE ? t('screens.home.talk') : t('screens.home.compose')}
        bottomInset={insets.bottom}
        onNavigate={goToTab}
        onCompose={handleVoice}
      />

      {notificationsOpen ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('screens.home.notifications')}
          className="absolute inset-0"
          onPress={() => setNotificationsOpen(false)}>
          <View className="bg-card border-border absolute right-5 top-24 w-64 rounded-2xl border p-4 shadow-xl shadow-black/15">
            <Text className="font-semibold">{t('screens.home.notifications')}</Text>
            <Text className="text-foreground-secondary mt-1 text-sm leading-5">
              {unreadNotifications > 0
                ? `${unreadNotifications} ${t('screens.home.reminders').toLowerCase()}`
                : t('screens.home.empty-agenda')}
            </Text>
          </View>
        </Pressable>
      ) : null}
    </View>
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
